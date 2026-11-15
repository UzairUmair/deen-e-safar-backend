import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, sep } from 'node:path';
import { proposedSource } from '../src/validation.js';
if (!process.argv[2]) { console.error('Provide the frontend content directory: npm run sources:prepare -- /path/to/deen-e-safar/public/content'); process.exit(1); }
const root = pathToFileURL(resolve(process.argv[2]) + sep);
const read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const meta = await read('sources.json'), rows = [];
for (let surah = 1; surah <= 114; surah++) {
  const { verses } = await read(`quran/${surah}.json`);
  for (const verse of verses) for (const language of ['en', 'ur', 'ar']) {
    const edition = language === 'en' ? meta.quran.english : language === 'ur' ? meta.quran.urdu : null;
    rows.push(proposedSource.parse({ sourceId: `quran:${surah}:${verse.id}:${language}`, sourceType: 'quran', collection: meta.quran.provider, reference: `Quran ${surah}:${verse.id}`, language, text: language === 'ar' ? verse.arabic : verse[language], sourceURL: meta.quran.url, edition: edition ? `${edition.title} (${edition.key}, v${edition.version})` : 'Arabic text accompanying the repository QuranEnc snapshot' }));
  }
}
for (const hadith of await read('hadiths.json')) for (const language of ['en', 'ur', 'ar']) {
  const text = language === 'en' ? hadith.hadeeth : language === 'ur' ? hadith.urdu : hadith.hadeeth_ar;
  if (!text) continue;
  rows.push(proposedSource.parse({ sourceId: `hadith:${hadith.id}:${language}`, sourceType: 'hadith', collection: meta.hadith.provider, reference: `Hadith ${hadith.id}`, language, text, sourceURL: hadith.source, edition: `HadeethEnc ${language}; repository snapshot ${meta.retrieved}`, authenticity: [language === 'ur' ? hadith.urduGrade : hadith.grade, language === 'ur' ? hadith.urduAttribution : hadith.attribution].filter(Boolean).join(' · ').slice(0, 1000) }));
}
const directory = new URL('../data/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('pending-sources.ndjson', directory), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
console.info(`Prepared ${rows.length} pending sources at ${fileURLToPath(new URL('pending-sources.ndjson', directory))}. No content or licensing approval granted.`);
