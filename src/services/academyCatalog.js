import { readFileSync } from 'node:fs';
export const academyCatalog = JSON.parse(readFileSync(new URL('../../content/academy.json', import.meta.url), 'utf8'));
export const academyLesson = id => academyCatalog.lessons.find(l => l.id === id);
export function selectAcademyTopic(question) {
  const text = question.toLowerCase();
  const aliases = { badr: /badr|بدر/, hijrah: /hijra|ہجرت/, bilal: /bilal|بلال/, 'abu-bakr': /abu bak|ابوبکر|ابو بکر/, khadijah: /khadij|خدیجہ/, uhud: /uhud|احد/, khandaq: /khandaq|خندق/, yusuf: /yusuf|yousuf|یوسف/, musa: /musa|moosa|موسی/, 'first-revelation': /revelation|وحی/, 'prophetic-example': /seerah|seerat|muhammad|سیرت|محمد/, patience: /patien|sabr|صبر/, fasting: /fast|roza|روز/, speech: /speech|گفتگو/ };
  const key = Object.keys(aliases).find(k => aliases[k].test(text));
  return key ? academyLesson('academy:' + key) : null;
}
