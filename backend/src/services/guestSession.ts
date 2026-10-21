import crypto from 'crypto';
import { z } from 'zod';
import GuestSession from '../models/GuestSession';
import ResumeAnalysis from '../models/ResumeAnalysis';
import User from '../models/User';

export const guestKeyHash = (key: string) => crypto.createHash('sha256').update(key).digest('hex');
export const validGuestKey = (key: unknown): key is string => typeof key === 'string' && /^[a-f0-9]{64}$/.test(key);
export function guestRetentionDays() {
  const days = Number(process.env.GUEST_RETENTION_DAYS ?? 30);
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('Invalid GUEST_RETENTION_DAYS');
  return days;
}
export const guestExpiry = () => new Date(Date.now() + guestRetentionDays() * 86400000);
const tag = z.string().trim().max(300).optional();
export const firstTouchSchema = z.object({
  utm_source: tag, utm_medium: tag, utm_campaign: tag, utm_content: tag, utm_term: tag, ref: tag,
});

export async function claimGuestSession(key: string, userId: string) {
  // Atomic owner assignment prevents two accounts from claiming the same device session.
  const session = await GuestSession.findOneAndUpdate({
    keyHash: guestKeyHash(key),
    $and: [
      { $or: [{ ownerId: null }, { ownerId: userId }] },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] },
    ],
  }, { $set: { ownerId: userId }, $unset: { expiresAt: 1 } }, { new: true });
  if (!session) return null;
  // Retriable, idempotent operations: a failed transfer can safely be retried.
  await ResumeAnalysis.updateMany({ guestSessionId: String(session._id), ownerId: null, expiresAt: { $gt: new Date() } }, {
    $set: { ownerId: userId }, $unset: { expiresAt: 1, sourceExpiresAt: 1 },
  });
  await User.updateOne({ _id: userId, firstTouch: { $exists: false } }, { $set: { firstTouch: session.firstTouch } });
  return session;
}
