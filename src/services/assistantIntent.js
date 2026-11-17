import { selectAcademyTopic } from './academyCatalog.js';
export function detectLanguage(question, selected) {
  if(selected && selected !== 'auto') return selected;
  if(/[\u0600-\u06ff]/u.test(question)) return 'ur';
  return /\b(mujhe|samjhao|sikhao|kya|kaise|batao|hai|hain)\b/i.test(question)?'roman-ur':'en';
}
export function classifyIntent(question) {
  const q=question.trim().replace(/[.!؟?]+$/u,'').trim();
  if(/^(hello|hi|hey|assalamu? alaikum|as[ -]?salaamu? alaikum|salam|how are you|السلام علیکم|السلام عليكم)$/iu.test(q)) return 'greeting';
  if(/personal fatwa|fatwa.*complex|ذاتی فتوی|zaati fatwa/i.test(q))return 'personal-ruling';
  if(/step by step|teach me|sikhao|سکھا|مرحلہ/i.test(q))return 'guided';
  if(/explain (it|that)|what happened next|who was involved|why was this|simpler|more detail|source of this|آسان|مزید|samjhao/i.test(q))return 'follow-up';
  return 'education';
}
export function localReply(intent,language){
 const ur=language==='ur',roman=language==='roman-ur';
 return {mode:intent==='greeting'?'greeting':'limited',generated:false,citations:[],text:intent==='greeting'?(ur?'وعلیکم السلام! آج آپ کیا سیکھنا چاہتے ہیں؟':roman?'Wa alaikum assalam! Aaj aap kya seekhna chahtay hain?':'Assalamu Alaikum! What would you like to learn today?'):(ur?'ذاتی فتویٰ کے لیے مستند عالم سے اپنے حالات پر بات کریں۔ میں ماخذ کے ساتھ عمومی تعلیمی وضاحت دے سکتا ہوں۔':roman?'Zaati fatwa ke liye mustanad aalim se apne halaat par baat karein. Main maakhaz ke saath aam taleemi wazahat de sakta hoon.':'For a personal fatwa, discuss your circumstances with a qualified scholar. I can explain general concepts using reviewed sources.')};
}
export function guidedLink(question){return selectAcademyTopic(question)?.id || (/beginning|اسلام|fundamental/i.test(question)?'academy:belief-conduct':null);}
