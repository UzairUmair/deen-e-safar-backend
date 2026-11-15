import { Router } from 'express';
import { z } from 'zod';
import * as v from '../validation.js';
import { parse, empty, verifyFirebaseToken, requireAdmin, quota } from '../middleware/security.js';
import { userService, publicProfile } from '../services/userService.js';
import { accountService, listPage, publicRecord } from '../services/accountService.js';
import { importGuest } from '../services/guestMigrationService.js';
import { approvedFilter, hashSource, termsOf } from '../services/retrievalService.js';
import { ApiError, missing } from '../utils/apiError.js';
import { validReference } from '../config/catalog.js';
export function apiRoutes({ repo, firebase, ai, env, shutdownSignal }) {
  const router = Router(), users = userService(repo, firebase), accounts = accountService(repo);
  const id = value => parse(v.objectId, value);
  const page = query => parse(v.pageQuery, query);
  const data = (res, value, status = 200) => res.status(status).json({ data: value });
  router.get('/health', async (_req, res) => {
    const ready = repo.ready();
    let evidence = false;
    if (ready && ai.configured) { try { evidence = Boolean(await repo.one('SourcePassage', approvedFilter)); } catch { /* no readiness claim on failure */ } }
    data(res, { status: ready ? 'ready' : 'not_ready', capabilities: { accounts: ready, generatedAI: ready && ai.configured && evidence } }, ready ? 200 : 503);
  });
  router.use(verifyFirebaseToken(firebase, users, env.FIREBASE_PROJECT_ID));
  router.post('/auth/sync', (req, res) => { parse(empty, req.body || {}); data(res, publicProfile(req.user)); });
  router.get('/users/me', (req, res) => data(res, publicProfile(req.user)));
  router.patch('/users/me', async (req, res) => data(res, publicProfile(await users.update(req.user, parse(v.profilePatch, req.body)))));
  router.delete('/users/me', async (req, res) => { parse(empty, req.body || {}); data(res, await users.delete(req.user, req.identity)); });
  router.post('/users/me/guest-import', async (req, res) => data(res, await importGuest(repo, req.user._id, parse(v.guestImport, req.body))));
  router.get('/bookmarks', async (req, res) => res.json(await listPage(repo, 'Bookmark', { userId: req.user._id }, page(req.query))));
  router.post('/bookmarks', async (req, res) => {
    const body = parse(v.bookmark, req.body);
    const row = await repo.withOwner(req.user._id, session => accounts.bookmark(req.user._id, body, session));
    data(res, publicRecord(row), 201);
  });
  router.delete('/bookmarks/:id', async (req, res) => data(res, await accounts.removeBookmark(req.user._id, id(req.params.id))));
  router.get('/reading-progress', async (req, res) => { parse(empty, req.query); data(res, (await repo.find('ReadingProgress', { userId: req.user._id }, { limit: 114, sort: { updatedAt: -1 } })).map(publicRecord)); });
  const surah = value => parse(z.coerce.number().int().min(1).max(114), value);
  router.get('/reading-progress/:surah', async (req, res) => { const row = await repo.one('ReadingProgress', { userId: req.user._id, surahNumber: surah(req.params.surah) }); data(res, row ? publicRecord(row) : null); });
  router.put('/reading-progress/:surah', async (req, res) => data(res, publicRecord(await accounts.reading(req.user._id, surah(req.params.surah), parse(v.reading, req.body)))));
  router.get('/learning-progress', async (req, res) => { parse(empty, req.query); data(res, (await repo.find('LearningProgress', { userId: req.user._id }, { limit: 15 })).map(publicRecord)); });
  router.put('/learning-progress/:lessonId', async (req, res) => data(res, publicRecord(await accounts.learning(req.user._id, parse(z.string().regex(/^\d{1,2}$/), req.params.lessonId), parse(v.learning, req.body)))));
  router.post('/quiz-attempts', async (req, res) => data(res, publicRecord(await accounts.quiz(req.user._id, parse(v.quiz, req.body))), 201));
  router.get('/quiz-attempts', async (req, res) => res.json(await listPage(repo, 'QuizAttempt', { userId: req.user._id }, page(req.query))));
  router.get('/ai/conversations', async (req, res) => res.json(await listPage(repo, 'AIConversation', { userId: req.user._id }, page(req.query))));
  router.post('/ai/conversations', async (req, res) => { const body = parse(v.title, req.body); data(res, publicRecord(await repo.withOwner(req.user._id, session => repo.insert('AIConversation', { userId: req.user._id, ...body, version: 0 }, session))), 201); });
  router.get('/ai/conversations/:id', async (req, res) => {
    const conversationId = id(req.params.id), filter = { userId: req.user._id, _id: conversationId };
    const conversation = await repo.one('AIConversation', filter);
    if (!conversation) throw missing();
    const result = await listPage(repo, 'AIMessage', { userId: req.user._id, conversationId }, page(req.query));
    const sources = await repo.find('SourcePassage', { ...approvedFilter, sourceId: { $in: [...new Set(result.data.flatMap(m => m.sourceRefs))] } }, { limit: 100 });
    const citationMap = new Map(sources.map(s => [s.sourceId, { id: s.sourceId, kind: s.sourceType, reference: s.reference, excerpt: s.text, href: s.sourceURL, external: true, edition: s.edition, authenticity: s.authenticity, language: s.language, attribution: s.licenseMetadata.attribution }]));
    res.json({ data: { conversation: publicRecord(conversation), messages: result.data.map(m => ({ ...m, citations: m.sourceRefs.map(ref => citationMap.get(ref)).filter(Boolean) })) }, meta: result.meta });
  });
  router.patch('/ai/conversations/:id', async (req, res) => {
    const filter = { _id: id(req.params.id), userId: req.user._id }, body = parse(v.title, req.body);
    const row = await repo.withOwner(req.user._id, session => repo.update('AIConversation', filter, body, session));
    if (!row) throw missing(); data(res, publicRecord(row));
  });
  router.delete('/ai/conversations/:id', async (req, res) => {
    const conversationId = id(req.params.id);
    await repo.withOwner(req.user._id, async session => {
      if (!await repo.one('AIConversation', { _id: conversationId, userId: req.user._id }, session)) throw missing();
      await repo.remove('AIMessage', { conversationId, userId: req.user._id }, session);
      await repo.remove('AIConversation', { _id: conversationId, userId: req.user._id }, session);
    }); data(res, { deleted: true });
  });
  router.post('/ai/chat', (req, _res, next) => { req.validatedChat = parse(v.chat, req.body); next(); }, quota(repo, env), async (req, res) => {
    const controller = new AbortController();
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    req.on('aborted', disconnect); res.on('close', disconnect);
    try { data(res, await ai.chat(req.user._id, req.validatedChat, AbortSignal.any([controller.signal, shutdownSignal]))); }
    finally { req.off('aborted', disconnect); res.off('close', disconnect); }
  });
  router.post('/content-reports', async (req, res) => {
    const body = parse(v.report, req.body);
    if (body.targetType === 'ai-message') { if (!await repo.one('AIMessage', { _id: id(body.targetId), userId: req.user._id, role: 'assistant' })) throw missing(); }
    else if (body.targetType === 'source') { if (!await repo.one('SourcePassage', { sourceId: body.targetId, ...approvedFilter })) throw missing(); }
    else if (!validReference(body.targetType, body.targetId)) throw new ApiError(400, 'INVALID_REFERENCE', 'Unknown content reference.');
    data(res, publicRecord(await repo.withOwner(req.user._id, session => repo.insert('ContentReport', { userId: req.user._id, ...body }, session))), 201);
  });
  router.use('/admin', requireAdmin);
  router.get('/admin/sources', async (req, res) => res.json(await listPage(repo, 'SourcePassage', {}, page(req.query))));
  router.post('/admin/sources', async (req, res) => {
    const source = parse(v.proposedSource, req.body);
    const value = await repo.upsert('SourcePassage', { sourceId: source.sourceId }, { ...source, contentHash: hashSource(source), terms: termsOf(source.text + ' ' + source.reference), reviewStatus: 'pending', licenseMetadata: { status: 'unverified' } });
    req.app.locals.audit({ event: 'source_proposed', actor: req.identity.uid, sourceId: source.sourceId });
    data(res, publicRecord(value), 201);
  });
  router.patch('/admin/sources/:id/review', async (req, res) => {
    const sourceId = id(req.params.id), body = parse(v.sourceReview, req.body);
    const current = await repo.one('SourcePassage', { _id: sourceId });
    if (!current) throw missing();
    const licenseMetadata = body.licenseMetadata || current.licenseMetadata;
    if (body.reviewStatus === 'approved' && (licenseMetadata.status !== 'approved' || !licenseMetadata.license || !licenseMetadata.attribution || !licenseMetadata.url)) throw new ApiError(400, 'LICENSE_REVIEW_REQUIRED', 'Approve licensing and attribution before approving this source.');
    const row = await repo.update('SourcePassage', { _id: sourceId, contentHash: body.contentHash }, { reviewStatus: body.reviewStatus, licenseMetadata, reviewNote: body.note, reviewedBy: req.identity.uid, reviewedAt: new Date() });
    if (!row) throw new ApiError(409, 'SOURCE_CHANGED', 'The source changed. Reload and review its current text.');
    req.app.locals.audit({ event: 'source_reviewed', actor: req.identity.uid, sourceId: current.sourceId, status: body.reviewStatus });
    data(res, publicRecord(row));
  });
  router.get('/admin/reports', async (req, res) => res.json(await listPage(repo, 'ContentReport', {}, page(req.query))));
  router.patch('/admin/reports/:id', async (req, res) => {
    const body = parse(v.reportReview, req.body);
    const row = await repo.update('ContentReport', { _id: id(req.params.id) }, { status: body.status, adminNote: body.note || '', reviewedBy: req.identity.uid, reviewedAt: new Date() });
    if (!row) throw missing();
    req.app.locals.audit({ event: 'report_reviewed', actor: req.identity.uid, reportId: String(row._id), status: row.status });
    data(res, publicRecord(row));
  });
  return router;
}
