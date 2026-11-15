import { loadEnv } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { initializeAdmin } from './config/firebaseAdmin.js';
import { createGroqProvider } from './config/groq.js';
import { createModels } from './models/index.js';
import { MongoRepository } from './repositories/mongoRepository.js';
import { createApp } from './createApp.js';
let connection, server;
const shutdown = new AbortController();
async function stop() {
  shutdown.abort();
  const timer = setTimeout(() => process.exit(1), 10000).unref();
  if (server) { server.closeIdleConnections(); await new Promise(resolve => server.close(resolve)); }
  await connection?.close(); clearTimeout(timer);
}
try {
  const env = loadEnv();
  connection = await connectDatabase(env.MONGODB_URI);
  const repo = new MongoRepository(connection, createModels(connection));
  await repo.initialize();
  const firebase = await initializeAdmin(env);
  const app = createApp({ repo, firebase, provider: createGroqProvider(env), env, shutdownSignal: shutdown.signal });
  server = app.listen(env.PORT, env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => console.info(JSON.stringify({ event: 'server_started', port: env.PORT })));
  server.headersTimeout = 15000; server.requestTimeout = 30000; server.keepAliveTimeout = 5000;
  server.on('error', async () => { console.error('Server listener failed.'); await stop(); process.exitCode = 1; });
  connection.on('disconnected', () => console.warn('Database connection unavailable.'));
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
} catch (error) {
  console.error(error.code === 'CONFIG_INVALID' ? error.message : 'Backend startup failed. Check database access and Firebase Admin configuration.');
  await connection?.close(); process.exitCode = 1;
}
