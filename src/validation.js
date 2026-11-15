import { z } from 'zod';
import { catalog, lessonById, validReference, validVerse } from './config/catalog.js';
export const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const short = n => z.string().trim().max(n);
const timezone = z.string().max(80).refine(v => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch { return false; } }, 'Invalid timezone');
export const location = z.strictObject({ name: short(80), country: short(80), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), timezone, source: z.enum(['default', 'city', 'device', 'manual']) });
export const quranPreferences = z.strictObject({ arabicSize: z.number().min(24).max(56), translationSize: z.number().min(14).max(26), showTranslation: z.boolean(), translation: z.enum(['en', 'ur']), width: z.enum(['comfortable', 'wide']), spacing: z.enum(['compact', 'normal', 'relaxed']), autoAdvance: z.boolean(), reciter: z.enum(['ar.alafasy', 'ar.husary']) });
const method = z.number().int().refine(n => [1, 3, 2, 4, 5, 15, 8, 13, 17, 20].includes(n), 'Unsupported prayer method');
export const prayerPreferences = z.strictObject({ location, method, school: z.union([z.literal(0), z.literal(1)]), hour12: z.boolean() });
export const preferences = z.strictObject({ language: z.enum(['en', 'ur', 'ar']), theme: z.enum(['light', 'dark']), displayName: short(60), quran: quranPreferences, prayer: prayerPreferences });
export const preferencePatch = preferences.partial().extend({ quran: quranPreferences.partial().optional(), prayer: prayerPreferences.partial().extend({ location: location.partial().optional() }).optional() });
export const mutation = { expectedVersion: z.number().int().nonnegative().optional(), mutationId: z.uuid().optional() };
export const profilePatch = z.strictObject({ name: short(120).optional(), preferences: preferencePatch.optional(), ...mutation });
export const bookmark = z.strictObject({ contentType: z.enum(['quran', 'dua', 'hadith']), contentRef: z.string().min(1).max(80) }).refine(v => validReference(v.contentType, v.contentRef), 'Unknown content reference');
export const reading = z.strictObject({ ayahNumber: z.number().int().positive(), ...mutation });
export const learning = z.strictObject({ status: z.enum(['in_progress', 'completed']).optional(), note: z.string().max(4000).optional(), ...mutation }).refine(v => v.status !== undefined || v.note !== undefined, 'Provide a progress change');
export const quiz = z.strictObject({ quizId: z.string().min(1).max(80), answers: z.array(z.number().int().nonnegative()).min(1).max(30), submissionId: z.uuid() });
export const title = z.strictObject({ title: short(160).min(1) });
export const chat = z.strictObject({ question: z.string().trim().min(3).max(2000), language: z.enum(['en', 'ur', 'ar']).default('en'), historyEnabled: z.boolean().default(false), conversationId: objectId.optional() }).refine(v => v.historyEnabled || !v.conversationId, 'History is disabled');
export const report = z.strictObject({ targetType: z.enum(['quran', 'dua', 'hadith', 'ai-message', 'source']), targetId: z.string().min(1).max(120), reason: z.string().trim().min(5).max(2000) });
export const pageQuery = z.strictObject({ limit: z.coerce.number().int().min(1).max(50).default(20), cursor: objectId.optional() });
const importPosition = z.strictObject({ surah: z.number().int(), ayah: z.number().int() }).refine(p => validVerse(p.surah, p.ayah), 'Invalid Quran position');
const importLesson = z.strictObject({ lessonId: z.string().max(10), note: z.string().max(4000).optional(), completed: z.boolean().default(false) }).refine(l => Boolean(lessonById(l.lessonId)), 'Unknown lesson');
export const guestImport = z.strictObject({ consent: z.literal(true), bookmarks: z.array(bookmark).max(2000).default([]), reading: z.array(importPosition).max(114).default([]), lessons: z.array(importLesson).max(15).default([]) });
const sourceURL = z.url().refine(v => {
  const url = new URL(v);
  return url.protocol === 'https:' && !url.username && !url.password && ['quranenc.com', 'www.quranenc.com', 'hadeethenc.com', 'www.hadeethenc.com', 'alquran.cloud', 'api.alquran.cloud'].includes(url.hostname);
}, 'Use an approved source publisher URL');
export const license = z.strictObject({ status: z.enum(['unverified', 'approved']), license: short(500), attribution: short(1200), url: z.url().max(1000).refine(v => { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; }) });
export const proposedSource = z.strictObject({ sourceId: z.string().regex(/^[a-z0-9:_-]{3,120}$/), sourceType: z.enum(['quran', 'hadith']), collection: short(160).min(1), reference: short(200).min(1), language: z.enum(['en', 'ur', 'ar']), text: z.string().min(1).max(16000), sourceURL, edition: short(200).min(1), authenticity: short(1000).optional() }).refine(v => {
  if (v.sourceType === 'quran') {
    const match = v.reference.match(/^Quran (\d{1,3}):(\d{1,3})$/);
    return match && validVerse(Number(match[1]), Number(match[2])) && v.sourceId === `quran:${Number(match[1])}:${Number(match[2])}:${v.language}`;
  }
  const match = v.reference.match(/^Hadith (\d+)$/);
  return match && catalog.hadithRefs.includes(match[1]) && v.sourceId === `hadith:${match[1]}:${v.language}`;
}, 'Source ID and reference must match the trusted content catalog');
export const sourceReview = z.strictObject({ contentHash: z.string().regex(/^[a-f\d]{64}$/), reviewStatus: z.enum(['approved', 'rejected', 'pending']), licenseMetadata: license.optional(), note: short(2000).min(5) });
export const reportReview = z.strictObject({ status: z.enum(['reviewed', 'resolved', 'rejected']), note: short(2000).optional() });
export function defaultPreferences() {
  return { language: 'en', theme: 'light', displayName: '', quran: { arabicSize: 34, translationSize: 17, showTranslation: true, translation: 'en', width: 'comfortable', spacing: 'normal', autoAdvance: true, reciter: 'ar.alafasy' }, prayer: { location: { name: 'Karachi', country: 'Pakistan', latitude: 24.8607, longitude: 67.0011, timezone: 'Asia/Karachi', source: 'default' }, method: 1, school: 1, hour12: true } };
}
export function mergePreferences(current, patch = {}) {
  return preferences.parse({ ...current, ...patch, quran: { ...current.quran, ...patch.quran }, prayer: { ...current.prayer, ...patch.prayer, location: { ...current.prayer.location, ...patch.prayer?.location } } });
}
