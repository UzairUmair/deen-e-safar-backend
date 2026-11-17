import { createHash } from 'node:crypto';
const STOP = new Set('the a an is are was were to of and or in on for about what which how does do be with please explain me i it this that سے ہے کے کی کا اور میں کیا ہیں پر عن في من ما هل على'.split(' '));
export const fold = text => text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ی/g, 'ي').replace(/ک/g, 'ك');
export const termsOf = text => [...new Set((fold(text).match(/[\p{L}\p{N}]+/gu) || []).filter(t => t.length >= 2 && t.length <= 48 && !STOP.has(t)))].slice(0, 2000);
export const hashSource = source => createHash('sha256').update(JSON.stringify([source.sourceId, source.sourceType, source.collection, source.reference, source.language, source.text, source.sourceURL, source.edition, source.authenticity || '', source.title || '', source.author || '', source.topicTags || [], source.academyScopes || []])).digest('hex');
export const approvedFilter = { reviewStatus: 'approved', 'licenseMetadata.status': 'approved' };
export async function retrieve(repo, question, language) {
  const aliases={'صبر':'patience prayer','رمضان':'fasting','بدر':'badr','ہجرت':'hijrah',patience:'sabr صبر',ramadan:'fasting روزہ رمضان',badr:'بدر',hijrah:'ہجرت',seerah:'prophetic محمد',muhammad:'محمد prophetic',bakr:'ابوبکر',umar:'عمر',fatihah:'فاتحہ',sabr:'patience صبر',roza:'fasting رمضان'};
  const expanded=termsOf(question).flatMap(t=>[t,...termsOf(aliases[t]||'')]);
  const terms = [...new Set(expanded)].slice(0, 30);
  if (!terms.length) return [];
  const candidates = await repo.find('SourcePassage', { ...approvedFilter, terms: { $in: terms } }, { limit: 200 });
  return candidates.map(source => ({ source, score: terms.reduce((n, t) => n + Number(source.terms.includes(t)), 0) + Number(source.language === language || (language==='roman-ur'&&source.language==='ur')) * .25 }))
    .filter(row => row.score >= 1).sort((a, b) => b.score - a.score || a.source.sourceId.localeCompare(b.source.sourceId)).slice(0, 8).map(row => row.source);
}
