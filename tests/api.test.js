import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { createModels } from '../src/models/index.js';
import { MongoRepository } from '../src/repositories/mongoRepository.js';
import { createApp } from '../src/createApp.js';
import { hashSource, termsOf } from '../src/services/retrievalService.js';
import { validateCitations } from '../src/services/citationValidator.js';
import { loadEnv } from '../src/config/env.js';
import { ingestSource } from '../src/services/sourceIngestionService.js';
import { createGroqProvider } from '../src/config/groq.js';
const env = { NODE_ENV: 'test', FIREBASE_PROJECT_ID: 'deen-e-safar', origins: ['http://localhost:3000'], TRUST_PROXY_HOPS: 0, AI_REQUESTS_PER_MINUTE: 10, AI_REQUESTS_PER_DAY: 100 };
let replica, connection, models, repo, app, provider, deleted;
const identity = uid => ({ uid, aud: env.FIREBASE_PROJECT_ID, iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, email: `${uid}@example.test`, name: uid, email_verified: uid !== 'unverified', auth_time: Date.now() / 1000, admin: uid === 'admin' });
const token = uid => `test-token-for-${uid}`;
const auth = uid => ({ Authorization: 'Bearer ' + token(uid) });
const firebase = {
  async verifyIdToken(value, revoked) {
    assert.equal(revoked, true);
    if (!value.startsWith('test-token-for-')) throw Error('Invalid token');
    const uid = value.slice(15);
    if (['expired', 'revoked'].includes(uid) || deleted.has(uid)) throw Error('Invalid session');
    if (uid === 'stale-auth') return { ...identity(uid), auth_time: Date.now() / 1000 - 3600 };
    return uid === 'wrong-project' ? { ...identity(uid), aud: 'other-project' } : identity(uid);
  },
  async deleteUser(uid) { deleted.add(uid); },
};
const verse = JSON.parse(readFileSync(new URL('./fixtures/quran-2-153.json', import.meta.url), 'utf8'));
const source = { sourceId: 'quran:2:153:en', sourceType: 'quran', collection: 'QuranEnc', reference: 'Quran 2:153', language: 'en', text: verse.en, edition: 'Noor International Center v1.1.2', sourceURL: 'https://quranenc.com/en/home/api' };
const licensing = { status: 'approved', license: 'Controlled test fixture, not production rights approval', attribution: 'Repository fixture: Noor International Center', url: 'https://quranenc.com/en/home/api' };
async function approveSource() { return models.SourcePassage.create({ ...source, contentHash: hashSource(source), terms: termsOf(source.text), reviewStatus: 'approved', licenseMetadata: licensing }); }
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  connection = await mongoose.createConnection(replica.getUri(), { dbName: 'deen_e_safar_test', serverSelectionTimeoutMS: 10000 }).asPromise();
  models = createModels(connection); repo = new MongoRepository(connection, models); await repo.initialize();
}, { timeout: 240000 });
after(async () => { await connection?.close(); await replica?.stop(); });
beforeEach(async () => {
  for (const model of Object.values(models)) await model.deleteMany({});
  deleted = new Set();
  provider = { configured: true, calls: 0, async complete() { this.calls++; return JSON.stringify({ answer: 'The retrieved passage discusses patience. [quran:2:153:en]', sourceIds: [source.sourceId], limitations: 'Read the passage in context.' }); } };
  app = createApp({ repo, firebase, provider, env, audit: () => {} }, express());
});
test('health, explicit CORS, malformed JSON and request size limits', async () => {
  const health = await request(app).get('/api/health').expect(200); assert.equal(health.body.data.capabilities.generatedAI, false);
  await request(app).get('/api/health').set('Origin', 'https://untrusted.example').expect(403);
  const allowed = await request(app).get('/api/health').set('Origin', env.origins[0]).expect(200); assert.equal(allowed.headers['access-control-allow-origin'], env.origins[0]);
  await request(app).post('/api/auth/sync').set('Content-Type', 'application/json').send('{').expect(400);
  await request(app).post('/api/auth/sync').send({ value: 'x'.repeat(70000) }).expect(413);
});
test('missing, malformed, invalid, expired, revoked and wrong-project tokens are rejected', async () => {
  await request(app).get('/api/users/me').expect(401);
  for (const value of ['Basic abc', 'Bearer invalid-value', 'Bearer ' + token('expired'), 'Bearer ' + token('revoked'), 'Bearer ' + token('wrong-project')]) await request(app).get('/api/users/me').set('Authorization', value).expect(401);
});
test('parallel auth sync is idempotent and cannot accept UID or role', async () => {
  await Promise.all(Array.from({ length: 8 }, () => request(app).post('/api/auth/sync').set(auth('alice')).send({}).expect(200)));
  assert.equal(await models.User.countDocuments({}), 1);
  await request(app).patch('/api/users/me').set(auth('alice')).send({ role: 'admin' }).expect(400);
  await request(app).post('/api/auth/sync').set(auth('alice')).send({ firebaseUid: 'bob' }).expect(400);
  await request(app).get('/api/admin/sources').set(auth('alice')).expect(403);
  assert.equal((await models.User.findOne({})).role, 'user');
});
test('profile patches are allowlisted, versioned and preserve nested defaults', async () => {
  const profile = await request(app).get('/api/users/me').set(auth('alice'));
  const mutationId = randomUUID();
  const body = { preferences: { quran: { arabicSize: 42 } }, expectedVersion: profile.body.data.version, mutationId };
  const first = await request(app).patch('/api/users/me').set(auth('alice')).send(body).expect(200);
  assert.equal(first.body.data.preferences.quran.translationSize, 17);
  assert.equal(first.body.data.preferences.quran.arabicSize, 42);
  const retry = await request(app).patch('/api/users/me').set(auth('alice')).send(body).expect(200); assert.equal(first.body.data.version, retry.body.data.version);
  await request(app).patch('/api/users/me').set(auth('alice')).send({ ...body, mutationId: randomUUID() }).expect(409);
  await request(app).patch('/api/users/me').set(auth('alice')).send({ preferences: { arbitrary: 1 } }).expect(400);
});
test('bookmark uniqueness, real content bounds, deletion and ownership', async () => {
  const body = { contentType: 'quran', contentRef: '2:255' };
  const a = await request(app).post('/api/bookmarks').set(auth('alice')).send(body).expect(201);
  const b = await request(app).post('/api/bookmarks').set(auth('alice')).send(body).expect(201); assert.equal(a.body.data.id, b.body.data.id);
  await request(app).post('/api/bookmarks').set(auth('alice')).send({ contentType: 'quran', contentRef: '114:7' }).expect(400);
  await request(app).get('/api/bookmarks').set(auth('bob')).expect(200).then(r => assert.equal(r.body.data.length, 0));
  await request(app).delete('/api/bookmarks/' + a.body.data.id).set(auth('bob')).expect(404);
  await request(app).delete('/api/bookmarks/not-an-id').set(auth('alice')).expect(400);
  await request(app).delete('/api/bookmarks/' + a.body.data.id).set(auth('alice')).expect(200);
});
test('reading validates actual per-surah bounds and rejects stale writes', async () => {
  await request(app).put('/api/reading-progress/114').set(auth('alice')).send({ ayahNumber: 7 }).expect(400);
  const body = { ayahNumber: 6, expectedVersion: 0, mutationId: randomUUID() };
  const a = await request(app).put('/api/reading-progress/114').set(auth('alice')).send(body).expect(200);
  const b = await request(app).put('/api/reading-progress/114').set(auth('alice')).send(body).expect(200); assert.equal(a.body.data.version, b.body.data.version);
  await request(app).put('/api/reading-progress/114').set(auth('alice')).send({ ayahNumber: 4, expectedVersion: 0, mutationId: randomUUID() }).expect(409);
  const other = await request(app).get('/api/reading-progress/114').set(auth('bob')).expect(200); assert.equal(other.body.data, null);
});
test('guest import requires consent, is idempotent, and rolls back partial failures', async () => {
  const payload = { consent: true, bookmarks: [{ contentType: 'quran', contentRef: '2:255' }], reading: [{ surah: 1, ayah: 3 }], lessons: [{ lessonId: '0', completed: true, note: 'Personal test note' }] };
  await request(app).post('/api/users/me/guest-import').set(auth('alice')).send({ ...payload, consent: false }).expect(400);
  const original = repo.insert;
  repo.insert = function (name, ...rest) { if (name === 'ReadingProgress') throw Error('INTERNAL_SENTINEL'); return original.call(this, name, ...rest); };
  await request(app).post('/api/users/me/guest-import').set(auth('alice')).send(payload).expect(500);
  assert.equal(await models.Bookmark.countDocuments({}), 0); repo.insert = original;
  await request(app).post('/api/users/me/guest-import').set(auth('alice')).send(payload).expect(200);
  await request(app).post('/api/users/me/guest-import').set(auth('alice')).send(payload).expect(200);
  assert.equal(await models.Bookmark.countDocuments({}), 1); assert.equal(await models.LearningProgress.countDocuments({}), 1);
  await request(app).put('/api/reading-progress/1').set(auth('alice')).send({ ayahNumber: 5 }).expect(200);
  await request(app).post('/api/users/me/guest-import').set(auth('alice')).send(payload).expect(200);
  assert.equal((await models.ReadingProgress.findOne({})).ayahNumber, 5);
});
test('learning notes persist and quiz scores are calculated from authoritative answers', async () => {
  await request(app).put('/api/learning-progress/0').set(auth('alice')).send({ status: 'completed', note: 'My reflection', expectedVersion: 0 }).expect(200);
  await request(app).put('/api/learning-progress/99').set(auth('alice')).send({ status: 'completed' }).expect(404);
  await request(app).post('/api/quiz-attempts').set(auth('alice')).send({ quizId: 'lesson:0', answers: [1], score: 999, submissionId: randomUUID() }).expect(400);
  const body = { quizId: 'lesson:0', answers: [1], submissionId: randomUUID() };
  await request(app).post('/api/quiz-attempts').set(auth('alice')).send(body).expect(201).then(r => assert.equal(r.body.data.score, 0));
  await request(app).post('/api/quiz-attempts').set(auth('alice')).send(body).expect(201); assert.equal(await models.QuizAttempt.countDocuments({}), 1);
});
test('unreviewed or unlicensed evidence is excluded; missing evidence does not invoke Groq', async () => {
  await models.SourcePassage.create({ ...source, contentHash: hashSource(source), terms: termsOf(source.text), reviewStatus: 'pending', licenseMetadata: { status: 'unverified' } });
  const reply = await request(app).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience', language: 'en' }).expect(200);
  assert.equal(reply.body.data.mode, 'limited'); assert.equal(provider.calls, 0);
});
test('AI citations come from reviewed metadata, history is opt-in and owner-private', async () => {
  await approveSource();
  const a = await request(app).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience', language: 'en' }).expect(200);
  assert.equal(a.body.data.mode, 'generated'); assert.equal(a.body.data.citations[0].href, source.sourceURL); assert.equal(await models.AIMessage.countDocuments({}), 0);
  const b = await request(app).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience', language: 'en', historyEnabled: true }).expect(200);
  const id = b.body.data.conversationId; assert.equal(await models.AIMessage.countDocuments({}), 2);
  await request(app).get('/api/ai/conversations/' + id).set(auth('bob')).expect(404);
  await request(app).delete('/api/ai/conversations/' + id).set(auth('bob')).expect(404);
  await request(app).post('/api/ai/chat').set(auth('bob')).send({ question: 'patience', language: 'en', historyEnabled: true, conversationId: id }).expect(404);
  await request(app).patch('/api/ai/conversations/' + id).set(auth('alice')).send({ title: 'My study' }).expect(200);
  await request(app).delete('/api/ai/conversations/' + id).set(auth('alice')).expect(200); assert.equal(await models.AIMessage.countDocuments({}), 0);
});
test('fabricated IDs, Quran references and invalid provider output never escape validation', async () => {
  await approveSource();
  for (const raw of ['not JSON', JSON.stringify({ answer: 'Unsupported answer', sourceIds: ['invented:id'] }), JSON.stringify({ answer: 'Quran 2:999 says something.', sourceIds: [source.sourceId] })]) {
    provider.complete = async () => raw;
    await request(app).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience', language: 'en', historyEnabled: true }).expect(200).then(r => assert.equal(r.body.data.mode, 'limited'));
  }
  assert.equal(await models.AIMessage.countDocuments({}), 0);
  assert.equal(validateCitations({ answer: 'Unknown [quran:2:999:en]', sourceIds: [source.sourceId] }, [source]), null);
});
test('Groq errors and backend exceptions do not expose private upstream details', async () => {
  await approveSource(); provider.complete = async () => { throw Error('INTERNAL_SENTINEL'); };
  const response = await request(app).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience', language: 'en' }).expect(503); assert.equal(JSON.stringify(response.body).includes('INTERNAL_SENTINEL'), false);
  const original = repo.one; repo.one = async () => { throw Error('INTERNAL_SENTINEL'); };
  const fail = await request(app).get('/api/users/me').set(auth('alice')).expect(500); assert.equal(JSON.stringify(fail.body).includes('INTERNAL_SENTINEL'), false); repo.one = original;
});
test('IP limits, durable AI quotas and email-verification gate return safe errors', async () => {
  const limited = createApp({ repo, firebase, provider, env, ipLimit: 2, audit: () => {} });
  await request(limited).get('/api/health').expect(200); await request(limited).get('/api/health').expect(200); await request(limited).get('/api/health').expect(429);
  await approveSource();
  await request(app).post('/api/ai/chat').set(auth('unverified')).send({ question: 'patience' }).expect(403);
  const quotaApp = createApp({ repo, firebase, provider, env: { ...env, AI_REQUESTS_PER_MINUTE: 1 }, audit: () => {} });
  await request(quotaApp).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience' }).expect(200);
  await request(quotaApp).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience' }).expect(429);
});
test('admin review requires licensing; reports enforce message ownership', async () => {
  const proposed = await request(app).post('/api/admin/sources').set(auth('admin')).send(source).expect(201);
  await request(app).patch('/api/admin/sources/' + proposed.body.data.id + '/review').set(auth('admin')).send({ contentHash: hashSource(source), reviewStatus: 'approved', note: 'Reviewed source text.' }).expect(400);
  await request(app).patch('/api/admin/sources/' + proposed.body.data.id + '/review').set(auth('admin')).send({ contentHash: hashSource(source), reviewStatus: 'approved', note: 'Controlled fixture approval.', licenseMetadata: licensing }).expect(200);
  const reply = await request(app).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience', historyEnabled: true }).expect(200);
  await request(app).post('/api/content-reports').set(auth('bob')).send({ targetType: 'ai-message', targetId: reply.body.data.messageId, reason: 'Please review this answer.' }).expect(404);
  await request(app).post('/api/content-reports').set(auth('alice')).send({ targetType: 'ai-message', targetId: reply.body.data.messageId, reason: 'Please review this answer.' }).expect(201);
  await request(app).get('/api/admin/reports').set(auth('admin')).expect(200).then(r => assert.equal(r.body.data.length, 1));
});
test('account deletion purges private records and invalidates subsequent access', async () => {
  await request(app).post('/api/bookmarks').set(auth('alice')).send({ contentType: 'quran', contentRef: '1:1' }).expect(201);
  await request(app).delete('/api/users/me').set(auth('alice')).send({}).expect(200);
  assert.equal(await models.User.countDocuments({}), 0); assert.equal(await models.Bookmark.countDocuments({}), 0);
  await request(app).get('/api/users/me').set(auth('alice')).expect(401);
});
test('production forbids emulator auth and startup validation never echoes environment values', () => {
  assert.throws(() => loadEnv({ NODE_ENV: 'production', MONGODB_URI: 'PRIVATE_SENTINEL', FIREBASE_PROJECT_ID: 'deen-e-safar', FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099', CLIENT_ORIGIN: '*' }), error => !error.message.includes('PRIVATE_SENTINEL'));
});

test('ingestion never grants approval and changed metadata invalidates prior review', async () => {
  assert.equal(await ingestSource(repo, source), 'created_pending');
  await assert.rejects(() => ingestSource(repo, { ...source, reviewStatus: 'approved' }));
  let row = await repo.one('SourcePassage', { sourceId: source.sourceId });
  await repo.update('SourcePassage', { _id: row._id }, { reviewStatus: 'approved', licenseMetadata: licensing });
  assert.equal(await ingestSource(repo, source), 'unchanged');
  assert.equal((await repo.one('SourcePassage', { sourceId: source.sourceId })).reviewStatus, 'approved');
  assert.equal(await ingestSource(repo, { ...source, edition: source.edition + ' metadata revision' }), 'updated_pending');
  row = await repo.one('SourcePassage', { sourceId: source.sourceId });
  assert.equal(row.reviewStatus, 'pending'); assert.equal(row.licenseMetadata.status, 'unverified');
  await request(app).patch(`/api/admin/sources/${row._id}/review`).set(auth('admin')).send({ contentHash: hashSource(source), reviewStatus: 'approved', note: 'Review of old revision.', licenseMetadata: licensing }).expect(409);
});

test('deletion requires recent authentication and remains closed if Admin deletion fails', async () => {
  await request(app).delete('/api/users/me').set(auth('stale-auth')).send({}).expect(409);
  const original = firebase.deleteUser;
  try {
    firebase.deleteUser = async () => { throw Error('PRIVATE_UPSTREAM_FAILURE'); };
    await request(app).post('/api/bookmarks').set(auth('alice')).send({ contentType: 'quran', contentRef: '1:1' }).expect(201);
    const failed = await request(app).delete('/api/users/me').set(auth('alice')).send({}).expect(503);
    assert.equal(failed.body.error.code, 'DELETION_PENDING'); assert.equal(JSON.stringify(failed.body).includes('PRIVATE_UPSTREAM_FAILURE'), false);
    await request(app).post('/api/bookmarks').set(auth('alice')).send({ contentType: 'quran', contentRef: '1:2' }).expect(409);
    assert.equal(await models.Bookmark.countDocuments({}), 0);
  } finally { firebase.deleteUser = original; }
  await request(app).delete('/api/users/me').set(auth('alice')).send({}).expect(200);
});

test('an in-flight AI answer cannot recreate private data after account deletion', async () => {
  await approveSource();
  let release, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  const original = provider.complete.bind(provider);
  provider.complete = async () => { entered(); await new Promise(resolve => { release = resolve; }); return original(); };
  const response = request(app).post('/api/ai/chat').set(auth('alice')).send({ question: 'patience', historyEnabled: true }).then(result => result);
  await ready;
  await request(app).delete('/api/users/me').set(auth('alice')).send({}).expect(200);
  release(); assert.equal((await response).status, 409);
  assert.equal(await models.AIConversation.countDocuments({}), 0); assert.equal(await models.AIMessage.countDocuments({}), 0); assert.equal(await models.RateBucket.countDocuments({}), 0);
});

test('Groq SDK sends configured model and structured output through server transport', async () => {
  let payload;
  const provider = createGroqProvider({ GROQ_API_KEY: 'controlled-test-only-key', GROQ_MODEL: 'configured-test-model', GROQ_RESPONSE_FORMAT: 'json_schema' }, { fetch: async (url, init) => {
    assert.equal(new URL(url).origin, 'https://api.groq.com');
    payload = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"answer":"test","sourceIds":[],"limitations":"fixture"}' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  } });
  const result = await provider.complete([{ role: 'user', content: 'controlled request' }], new AbortController().signal);
  assert.equal(payload.model, 'configured-test-model'); assert.equal(payload.response_format.type, 'json_schema'); assert.equal(payload.response_format.json_schema.strict, true); assert.equal(typeof result, 'string');
});

test('authoritative catalog, Quran bounds and uniqueness indexes are valid', async () => {
  const catalog = JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'));
  assert.match(catalog.sourceHash, /^[a-f0-9]{64}$/);
  for (const lesson of catalog.lessons) { assert.ok(Number.isInteger(lesson.correct)); assert.ok(lesson.correct >= 0 && lesson.correct < lesson.options.length); }
  assert.equal(catalog.lessons.length, 15); assert.equal(catalog.ayahCounts.reduce((sum, n) => sum + n, 0), 6236);
  await assert.rejects(() => models.ReadingProgress.create({ userId: new mongoose.Types.ObjectId(), surahNumber: 114, ayahNumber: 7 }));
  assert.ok((await models.Bookmark.listIndexes()).some(index => index.unique && index.key.userId && index.key.contentRef));
});

test('bookmark and message cursors paginate without duplicates or owner leakage', async () => {
  await request(app).post('/api/auth/sync').set(auth('alice')).send({}).expect(200);
  const owner = await models.User.findOne({ firebaseUid: 'alice' });
  await models.Bookmark.insertMany(Array.from({ length: 55 }, (_, i) => ({ userId: owner._id, contentType: 'quran', contentRef: `2:${i + 1}` })));
  const first = await request(app).get('/api/bookmarks?limit=50').set(auth('alice')).expect(200);
  const second = await request(app).get('/api/bookmarks?limit=50&cursor=' + first.body.meta.nextCursor).set(auth('alice')).expect(200);
  assert.equal(first.body.data.length, 50); assert.equal(second.body.data.length, 5); assert.equal(second.body.meta.nextCursor, null);
  assert.equal(new Set([...first.body.data, ...second.body.data].map(row => row.id)).size, 55);
  await request(app).get('/api/bookmarks?limit=500').set(auth('alice')).expect(400);
  await request(app).get('/api/bookmarks?cursor=not-an-object-id').set(auth('alice')).expect(400);
  const conversation = await models.AIConversation.create({ userId: owner._id, title: 'Controlled history' });
  await models.AIMessage.insertMany(Array.from({ length: 25 }, (_, i) => ({ userId: owner._id, conversationId: conversation._id, role: i % 2 ? 'assistant' : 'user', content: `Controlled test message ${i}`, sourceRefs: [] })));
  const messages = await request(app).get(`/api/ai/conversations/${conversation._id}?limit=20`).set(auth('alice')).expect(200);
  const older = await request(app).get(`/api/ai/conversations/${conversation._id}?limit=20&cursor=${messages.body.meta.nextCursor}`).set(auth('alice')).expect(200);
  assert.equal(messages.body.data.messages.length, 20); assert.equal(older.body.data.messages.length, 5);
  await request(app).get(`/api/ai/conversations/${conversation._id}?cursor=${messages.body.meta.nextCursor}`).set(auth('bob')).expect(404);
});
