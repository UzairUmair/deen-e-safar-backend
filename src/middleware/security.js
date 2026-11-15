import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../utils/apiError.js';
export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'INVALID_INPUT', 'Check the provided fields.', result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
  return result.data;
}
export const empty = z.strictObject({});
export const ipLimiter = (maximum = 300) => rateLimit({ windowMs: 15 * 60000, limit: maximum, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, _res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.')) });
export function verifyFirebaseToken(firebase, users, projectId) {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    const match = typeof header === 'string' && header.match(/^Bearer ([^\s,]{10,8192})$/);
    if (!match) throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in to continue.');
    let identity;
    try { identity = await firebase.verifyIdToken(match[1], true); }
    catch { throw new ApiError(401, 'INVALID_TOKEN', 'Your sign-in session is invalid or expired. Sign in again.'); }
    if (!identity || typeof identity.uid !== 'string' || !identity.uid || identity.uid.length > 128 || identity.aud !== projectId || identity.iss !== `https://securetoken.google.com/${projectId}` || identity.firebase?.tenant) throw new ApiError(401, 'INVALID_TOKEN', 'The sign-in token is not valid for this application.');
    req.identity = identity;
    req.user = await users.ensure(identity, req.method === 'DELETE' && req.path.replace(/\/+$/, '') === '/users/me');
    next();
  };
}
export function requireAdmin(req, _res, next) {
  if (req.identity.admin !== true) throw new ApiError(403, 'ADMIN_REQUIRED', 'Administrator access is required.');
  next();
}
export function quota(repo, env) {
  return async (req, res, next) => {
    if (req.identity.email_verified !== true) throw new ApiError(403, 'EMAIL_VERIFICATION_REQUIRED', 'Verify your email before requesting generated answers.');
    await repo.withOwner(req.user._id, async session => {
      // Quotas themselves are atomic and shared by every API instance.
      for (const [scope, maximum, duration] of [['ai-minute', env.AI_REQUESTS_PER_MINUTE, 60000], ['ai-day', env.AI_REQUESTS_PER_DAY, 86400000]]) {
        const result = await repo.consumeQuota(req.user._id, scope, maximum, duration, session);
        if (!result.allowed) { res.set('Retry-After', String(result.retryAfter)); throw new ApiError(429, 'AI_QUOTA_EXCEEDED', 'Your generated-answer limit has been reached. Try again later.'); }
      }
    });
    next();
  };
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let safe = error instanceof ApiError ? error : null;
  if (!safe && error.type === 'entity.too.large') safe = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request is too large.');
  if (!safe && error.type === 'entity.parse.failed') safe = new ApiError(400, 'INVALID_JSON', 'Send a valid JSON object.');
  if (!safe && error.code === 11000) safe = new ApiError(409, 'DUPLICATE_RECORD', 'This record already exists. Refresh and retry.');
  if (!safe && ['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) safe = new ApiError(400, 'INVALID_INPUT', 'Check the provided fields.');
  if (!safe && /Mongo|Mongoose/.test(error.name)) safe = new ApiError(503, 'DATABASE_UNAVAILABLE', 'Account storage is temporarily unavailable. Please retry.');
  const status = safe?.status || 500;
  if (status >= 500) req.app.locals.audit({ event: 'request_failed', requestId: req.requestId, code: safe?.code || 'INTERNAL_ERROR', status });
  res.status(status).json({ error: { code: safe?.code || 'INTERNAL_ERROR', message: safe?.message || 'The request could not be completed.', requestId: req.requestId, ...(safe?.details ? { details: safe.details } : {}) } });
}
