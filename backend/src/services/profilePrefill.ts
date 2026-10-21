import { Direction, Level, City, type CreateProfileBody } from '../types';
import type { z } from 'zod';
import { profileSchema } from '../schemas/resumeAnalysis';

type ExtractedProfile = z.infer<typeof profileSchema>;
const clean = (value: string | null | undefined, max: number) => value?.trim().slice(0, max) || '';
function legacyHeaderName(profile: ExtractedProfile, source: string | undefined): string | undefined {
  if (!source) return undefined;
  const lines = source.split(/\r?\n/).map(line => line.replace(/^#{1,6}\s*/, '').trim()).filter(Boolean);
  // Only the opening identity block, immediately followed by contact details.
  const index = /^(резюме|resume|curriculum vitae|cv)$/i.test(lines[0] ?? '') ? 1 : 0;
  const candidate = lines[index];
  if (!candidate || candidate.length > 100 || !/^[\p{Lu}][\p{L}\p{M}'’\-]+(?:\s+[\p{Lu}][\p{L}\p{M}'’\-]+){1,3}$/u.test(candidate)) return undefined;
  if (!lines.slice(index + 1, index + 4).some(line => /[^\s@]+@[^\s@]+\.[^\s@]+|\+\d[\d\s()\-]{8,}/.test(line))) return undefined;
  const normalized = candidate.toLocaleLowerCase();
  if (profile.role?.trim().toLocaleLowerCase() === normalized || profile.experience.some(item => item.company?.trim().toLocaleLowerCase() === normalized)) return undefined;
  if (/(developer|engineer|manager|designer|analyst|director|specialist|resume|company|corporation|studio|\b(?:inc|ltd|llc)\b|разработчик|инженер|менеджер|дизайнер|аналитик|директор|специалист|резюме|компания|студия)/i.test(candidate)) return undefined;
  return candidate;
}
function startDate(value: string | null) {
  if (!value) return undefined;
  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value.trim());
  const local = /^(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!iso && !local) return undefined;
  const year = Number(iso?.[1] ?? local?.[2]);
  const month = Number(iso?.[2] ?? local?.[1]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return undefined;
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Suggestions only: incomplete extracted data must not publish a public profile. */
export function buildProfilePrefill(profile: ExtractedProfile, accountName?: string, extractedText?: string): Partial<CreateProfileBody> {
  const values: Partial<CreateProfileBody> = {};
  // Legacy analyses may contain the name only in source labels or the contact header.
  const labelledName = extractedText?.match(/^(?:ФИО|Ф\.И\.О\.|Имя(?: и фамилия)?|Full name|Name)\s*:\s*([^\r\n]{2,100})$/im)?.[1]?.trim();
  const legacyName = labelledName && /^[\p{L}\p{M} .’'\-]+$/u.test(labelledName) ? labelledName : undefined;
  const name = profile.name?.trim() || legacyName || legacyHeaderName(profile, extractedText) || accountName?.trim();
  if (name) values.name = name.slice(0, 100);
  if (profile.direction && Object.values(Direction).includes(profile.direction)) values.directions = [profile.direction];
  if (profile.level && Object.values(Level).includes(profile.level)) values.level = profile.level;
  const skills = [...new Set(profile.skills.map(value => value.trim()).filter(Boolean))];
  if (skills.length) values.skills = skills;
  if (profile.role?.trim()) values.currentPosition = clean(profile.role, 120);
  if (profile.experience.length) {
    values.workplaces = profile.experience.slice(0, 10).map(item => ({
      company: clean(item.company, 120), position: clean(item.role, 120),
      period: [item.startDate, item.endDate].filter(Boolean).join(' — ').slice(0, 80),
      achievement: [...item.responsibilities, ...item.achievements].map(line => line.trim()).filter(Boolean).join('\n').slice(0, 500),
      projects: [],
    }));
    values.experience = profile.experience.map(item => [item.company, item.role,
      [item.startDate, item.endDate].filter(Boolean).join(' — '),
      ...item.responsibilities, ...item.achievements].filter(Boolean).join('\n')).join('\n\n').slice(0, 2000);
    // A missing end date is ambiguous; only explicitly ongoing employment fills current-company fields.
    const ongoing = profile.experience.filter(item => item.endDate && /^(present|current|now|н\.?\s?в\.?|по настоящее время|настоящее время|қазіргі уақытқа дейін|hozirgacha)$/i.test(item.endDate.trim()))
      .sort((a, b) => (startDate(b.startDate)?.getTime() ?? 0) - (startDate(a.startDate)?.getTime() ?? 0))[0];
    if (ongoing) {
      if (ongoing.company?.trim()) values.currentCompany = clean(ongoing.company, 255);
      if (ongoing.role?.trim()) values.currentPosition = clean(ongoing.role, 120);
      if (ongoing.achievements.length) values.currentAchievement = ongoing.achievements.join('\n').slice(0, 500);
      const date = startDate(ongoing.startDate);
      if (date) values.careerStartDate = date;
    }
  }
  const location = profile.location?.toLowerCase() ?? '';
  if (/(^|[\s,])(алматы|almaty|алма-ата)([\s,]|$)/i.test(location)) values.city = City.ALMATY;
  else if (/(^|[\s,])(астана|astana|нур-султан|nur-sultan)([\s,]|$)/i.test(location)) values.city = City.ASTANA;
  else if (/(^|[\s,])(шымкент|shymkent)([\s,]|$)/i.test(location)) values.city = City.SHYMKENT;
  else if (/(казахстан|kazakhstan|қазақстан)/i.test(location)) values.city = City.OTHER_KZ;
  // Career goals, language preferences and relocation consent are personal choices, not AI guesses.
  return values;
}
