import { readFileSync } from 'node:fs';
export const catalog = JSON.parse(readFileSync(new URL('../../content/catalog.json', import.meta.url), 'utf8'));
export function validVerse(surah, ayah) {
  return Number.isInteger(surah) && surah >= 1 && surah <= 114 && Number.isInteger(ayah) && ayah >= 1 && ayah <= catalog.ayahCounts[surah - 1];
}
export function validReference(type, ref) {
  if (type === 'quran') { const [s, a] = ref.split(':').map(Number); return /^\d{1,3}:\d{1,3}$/.test(ref) && validVerse(s, a); }
  if (type === 'dua') return catalog.duaRefs.includes(ref);
  return type === 'hadith' && catalog.hadithRefs.includes(ref);
}
export const lessonById = id => catalog.lessons.find(l => l.id === id);
export function quizById(id) {
  if (id === 'discovery') return catalog.quizzes.discovery;
  return id.startsWith('lesson:') ? lessonById(id.slice(7)) : null;
}
