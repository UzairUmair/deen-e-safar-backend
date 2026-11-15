import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { apiRoutes } from './routes/api.js';
import { aiService } from './services/groqService.js';
import { ApiError } from './utils/apiError.js';
import { errorHandler, ipLimiter } from './middleware/security.js';
export function createApp({ repo, firebase, provider, env, audit = event => console.info(JSON.stringify(event)), shutdownSignal = new AbortController().signal, ipLimit = 1200 }, app = express()) {
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS || false);
  app.locals.audit = audit;
  app.use((req, res, next) => { req.requestId = randomUUID(); res.set('X-Request-Id', req.requestId); res.set('Cache-Control', 'no-store'); next(); });
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => callback(origin && !env.origins.includes(origin) ? new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This frontend origin is not allowed.') : null, true),
    credentials: false, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], exposedHeaders: ['X-Request-Id', 'Retry-After'], maxAge: 600,
  }));
  app.use('/api', ipLimiter(ipLimit));
  app.use('/api/users/me/guest-import', express.json({ limit: '256kb', strict: true }));
  app.use(express.json({ limit: '64kb', strict: true }));
  app.use('/api', apiRoutes({ repo, firebase, ai: aiService(repo, provider), env, shutdownSignal }));
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'The requested endpoint was not found.')));
  app.use(errorHandler);
  return app;
}
