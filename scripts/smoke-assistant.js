// Explicit live-provider transport and grounded-service smoke; no production DB writes.
import {createGroqProvider} from '../src/config/groq.js';
import {aiService} from '../src/services/groqService.js';
import {hashSource} from '../src/services/retrievalService.js';
if(!process.env.GROQ_API_KEY)throw Error('Configure GROQ_API_KEY securely.');
const source={sourceId:'history:smoke:1:en',sourceType:'history',reference:'Controlled transport fixture',language:'en',text:'This is a software smoke test. It does not establish a religious or historical fact.',edition:'Local test fixture',collection:'Software test',sourceURL:'https://example.org/test',reviewStatus:'approved',licenseMetadata:{status:'approved',attribution:'Locally authored software test fixture'},terms:['software','smoke','test']};source.contentHash=hashSource(source);
const repo={find:async()=>[source],one:async()=>null};
try{const result=await aiService(repo,createGroqProvider(process.env)).chat('local-smoke',{question:'Explain this software smoke test using only its supplied evidence.',language:'en',historyEnabled:false},new AbortController().signal);if(!result.generated||result.citations.length!==1)throw Error();console.log('PASS: real Groq SDK + assistant service + citation validation; controlled software evidence only. No production MongoDB or religious accuracy claim.');}catch{console.error('Live Groq smoke failed. No upstream content or credentials logged.');process.exitCode=1;}
