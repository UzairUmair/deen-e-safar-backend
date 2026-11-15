import express from 'express';
import { loadEnv } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initializeAdmin } from './config/firebaseAdmin.js';
import { createGroqProvider } from './config/groq.js';
import { createModels } from './models/index.js';
import { MongoRepository } from './repositories/mongoRepository.js';
import { createApp } from './createApp.js';
// Always expose a valid Vercel handler, including when startup configuration fails.
const app = express();
app.disable('x-powered-by');
export default app;
let connection, server;
let startupStage = 'environment configuration';
const shutdown = new AbortController();
async function stop() {
  shutdown.abort();
  const timer = setTimeout(() => process.exit(1), 10000).unref();
  if (server) { server.closeIdleConnections(); await new Promise(resolve => server.close(resolve)); }
  await connection?.close(); clearTimeout(timer);
}
try {
  const env = loadEnv();
  startupStage = 'MongoDB connection';
  connection = await connectDatabase(env.MONGODB_URI);
  startupStage = 'MongoDB index initialization';
  const repo = new MongoRepository(connection, createModels(connection));
  await repo.initialize();
  startupStage = 'Firebase Admin credentials';
  const firebase = await initializeAdmin(env);
  startupStage = 'Express initialization';
  // Vercel detects Express only when the entry file imports it directly.
  createApp({ repo, firebase, provider: createGroqProvider(env), env, shutdownSignal: shutdown.signal }, app);
  if (process.env.VERCEL !== '1') {
    server = app.listen(env.PORT, env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => console.info(JSON.stringify({ event: 'server_started', port: env.PORT })));
    server.headersTimeout = 15000; server.requestTimeout = 30000; server.keepAliveTimeout = 5000;
    server.on('error', async () => { console.error('Server listener failed.'); await stop(); process.exitCode = 1; });
  }
  connection.on('disconnected', () => console.warn('Database connection unavailable.'));
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
} catch (error) {
  console.error(error.code === 'CONFIG_INVALID' ? error.message : `Backend startup failed during ${startupStage}. Check production configuration.`);
  await connection?.close();
  app.use((_req, res) => res.set('Cache-Control', 'no-store').status(503).json({
    error: { code: 'SERVICE_UNAVAILABLE', message: 'The backend is not ready. Please try again later.' },
  }));
  if (process.env.VERCEL !== '1') process.exitCode = 1;
}
