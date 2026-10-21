import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import GuestSession from '../models/GuestSession';
import authMiddleware from '../middleware/authMiddleware';
import type { AuthRequest } from '../types';
import { z } from 'zod';
import { claimGuestSession, firstTouchSchema, guestExpiry, guestKeyHash, guestRetentionDays, validGuestKey } from '../services/guestSession';

const router = Router();
router.use(rateLimit({ windowMs: 60000, max: 60, standardHeaders: true, legacyHeaders: false }));
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!validGuestKey(req.headers['x-guest-id'])) { res.status(400).json({ error: 'invalid_guest_session' }); return; }
  next();
});
router.post('/', async (req, res) => {
  const parsed = firstTouchSchema.safeParse(req.body?.utm ?? {});
  if (!parsed.success) { res.status(400).json({ error: 'invalid_attribution' }); return; }
  const keyHash = guestKeyHash(req.headers['x-guest-id'] as string);
  const language = z.enum(['ru', 'en', 'kk', 'kz', 'uz']).catch('ru').parse(req.body?.language);
  // setOnInsert locks attribution even when the first visit had no campaign tags.
  try {
    await GuestSession.updateOne({ keyHash }, { $setOnInsert: {
      keyHash, language, firstTouch: { ...parsed.data, capturedAt: new Date() }, expiresAt: guestExpiry(),
    } }, { upsert: true });
  } catch (error: any) { if (error.code !== 11000) throw error; }
  const session = await GuestSession.findOne({ keyHash });
  if (!session || (session.expiresAt && session.expiresAt <= new Date())) {
    res.status(410).json({ error: 'guest_session_expired' }); return;
  }
  res.json({ retentionDays: guestRetentionDays() });
});
router.post('/claim', authMiddleware, async (req: AuthRequest, res) => {
  const session = await claimGuestSession(req.headers['x-guest-id'] as string, req.user!.userId);
  if (!session) { res.status(409).json({ error: 'guest_session_unavailable' }); return; }
  res.json({ linked: true });
});
router.get('/saved-draft', authMiddleware, async (req: AuthRequest, res) => {
  const session = await GuestSession.findOne({ ownerId: req.user!.userId, draft: { $exists: true } }).sort({ updatedAt: -1 }).select('+draft');
  res.json({ draft: session?.draft ?? null });
});
const text = z.string().max(80000);
const draftSchema = z.object({
  language: z.enum(['ru', 'en', 'kk', 'kz', 'uz']).optional(),
  upload: z.object({
    sourceType: z.enum(['file', 'text', 'linkedin']), fileName: z.string().nullable(), fileSize: z.number().nullable(),
    resumeText: text, linkedinUrl: text, jobLocation: z.enum(['home', 'abroad']).nullable(), targetCountry: text,
    desiredRole: text, outputLanguage: z.enum(['original', 'en']), consent: z.boolean(),
  }).optional(),
  builder: z.object({
    role: text, skills: text, education: text, languages: text, location: text, targetCountry: text,
    jobLocation: z.enum(['home', 'abroad']), noExperience: z.boolean(), consent: z.boolean(),
    experience: z.array(z.object({ id: z.number(), company: text, role: text, start: text, end: text, duties: text, achievements: text })).max(100),
  }).optional(),
}).refine(value => JSON.stringify(value).length <= 100000);
router.use('/draft', (req, res, next) => {
  if (req.headers.authorization) return authMiddleware(req, res, next);
  next();
});
async function draftSession(req: AuthRequest) {
  return GuestSession.findOne({ keyHash: guestKeyHash(req.headers['x-guest-id'] as string),
    $and: [
      { $or: [{ ownerId: null }, ...(req.user ? [{ ownerId: req.user.userId }] : [])] },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] },
    ],
  }).select('+draft');
}
router.get('/draft', async (req: AuthRequest, res) => {
  const session = await draftSession(req);
  if (!session) { res.status(404).json({ error: 'guest_session_unavailable' }); return; }
  res.json({ draft: session.draft ?? null });
});
router.put('/draft', async (req: AuthRequest, res) => {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'invalid_draft' }); return; }
  const session = await draftSession(req);
  if (!session) { res.status(404).json({ error: 'guest_session_unavailable' }); return; }
  await GuestSession.updateOne({ _id: session._id, ownerId: session.ownerId }, { $set: { draft: parsed.data } });
  res.json({ saved: true });
});
export default router;
