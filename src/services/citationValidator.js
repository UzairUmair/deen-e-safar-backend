import { z } from 'zod';
const output = z.strictObject({ answer: z.string().trim().min(1).max(7000), sourceIds: z.array(z.string().max(120)).min(1).max(8), limitations: z.string().max(1000).optional() });
export function validateCitations(raw, retrieved) {
  let parsed;
  try { parsed = output.parse(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch { return null; }
  const allowed = new Map(retrieved.map(source => [source.sourceId, source]));
  if (new Set(parsed.sourceIds).size !== parsed.sourceIds.length || parsed.sourceIds.some(id => !allowed.has(id))) return null;
  for (const match of parsed.answer.matchAll(/\[([a-z]+:[a-z0-9:_-]+)\]/gi)) if (!parsed.sourceIds.includes(match[1])) return null;
  const normalized = parsed.answer.replace(/[٠-٩۰-۹]/g, n => String('٠١٢٣٤٥٦٧٨٩'.includes(n) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(n) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(n)));
  for (const match of normalized.matchAll(/\b(\d{1,3}):(\d{1,3})\b/g)) {
    if (!parsed.sourceIds.some(id => allowed.get(id).sourceType === 'quran' && allowed.get(id).reference.match(/\d{1,3}:\d{1,3}/)?.[0] === match[0])) return null;
  }
  return { ...parsed, citations: parsed.sourceIds.map(id => {
    const s = allowed.get(id);
    return { id, kind: s.sourceType, reference: s.reference, excerpt: s.text, language: s.language, edition: s.edition, collection: s.collection, href: s.sourceURL, external: true, attribution: s.licenseMetadata.attribution, authenticity: s.authenticity || undefined };
  }) };
}
