// Local integration harness. These simulated identities/answers never reach a live service.
import { readFileSync } from 'node:fs';
import { hashSource, termsOf } from '../src/services/retrievalService.js';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connectDatabase } from '../src/config/database.js';
import { initializeAdmin } from '../src/config/firebaseAdmin.js';
import { createModels } from '../src/models/index.js';
import { MongoRepository } from '../src/repositories/mongoRepository.js';
import { createApp } from '../src/createApp.js';
if (process.env.NODE_ENV !== 'development' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIREBASE_PROJECT_ID !== 'demo-deen-e-safar') throw new Error('Run only with the documented local emulator configuration.');
const replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
const connection = await connectDatabase(replica.getUri());
const repo = new MongoRepository(connection, createModels(connection)); await repo.initialize();
const firebase = await initializeAdmin(process.env);
const shutdown = new AbortController();
const fixtures=process.env.ACADEMY_TEST_FIXTURES==='1';
if(fixtures){
  const verse=JSON.parse(readFileSync(new URL('../tests/fixtures/quran-2-153.json',import.meta.url),'utf8'));
  const source={sourceId:'quran:2:153:en',sourceType:'quran',collection:'Controlled test evidence',reference:'Quran 2:153',language:'en',text:verse.en,sourceURL:'https://quranenc.com/en/home/api',edition:'Noor International Center v1.1.2'};
  await repo.insert('SourcePassage',{...source,terms:termsOf(source.text),contentHash:hashSource(source),reviewStatus:'approved',licenseMetadata:{status:'approved',license:'Controlled local test fixture only, not production approval',attribution:'Repository fixture',url:source.sourceURL}});
}
const provider=fixtures?{configured:true,async complete(messages){
  const input=JSON.parse(messages[1].content),ids=input.evidence.map(s=>s.sourceId);
  if(input.request.question?.includes('SIMULATE_UNAVAILABLE'))throw Error('controlled provider outage');
  if(input.request.action==='quiz')return JSON.stringify({question:input.request.quizKind==='true-false'?'The passage connects patience with prayer.':'Which practice is paired with patience?',options:input.request.quizKind==='true-false'?['True','False']:['Prayer','Wealth','Travel','Silence'],correct:0,explanation:'The supplied passage mentions prayer with patience.',sourceIds:ids});
  return JSON.stringify({keyTerms:['patience','prayer'],answer:input.request.language==='ur'?'اس آیت میں صبر اور نماز کے ذریعے مدد طلب کرنے کا ذکر ہے۔':input.request.language==='roman-ur'?'Is ayat mein sabr aur namaz ke zariye madad talab karne ka zikr hai.':'This passage connects patience and prayer.',sourceIds:ids,limitations:'Controlled local mock; not a live Groq answer.',keyPoints:['Read the passage in context.'],uncertaintyNotes:[]});
}}:{configured:false};
const server = createApp({ repo, firebase, provider, env: { FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID, origins: ['http://127.0.0.1:3100'], TRUST_PROXY_HOPS: 0, AI_REQUESTS_PER_MINUTE: fixtures?60:10, AI_REQUESTS_PER_DAY: 100 }, shutdownSignal: shutdown.signal }).listen(4001, '127.0.0.1', () => console.info('Local test API ready on 127.0.0.1:4001; temporary MongoDB; AI provider is a controlled local fixture only when ACADEMY_TEST_FIXTURES=1.'));
async function stop() { shutdown.abort(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await connection.close(); await replica.stop(); }
process.once('SIGINT', stop); process.once('SIGTERM', stop);
