// Local integration harness. These simulated identities/answers never reach a live service.
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
const server = createApp({ repo, firebase, provider: { configured: false }, env: { FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID, origins: ['http://127.0.0.1:3100'], TRUST_PROXY_HOPS: 0, AI_REQUESTS_PER_MINUTE: 10, AI_REQUESTS_PER_DAY: 100 }, shutdownSignal: shutdown.signal }).listen(4001, '127.0.0.1', () => console.info('Local test API ready on 127.0.0.1:4001; temporary MongoDB; AI generation disabled.'));
async function stop() { shutdown.abort(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await connection.close(); await replica.stop(); }
process.once('SIGINT', stop); process.once('SIGTERM', stop);
