import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { loadEnv } from '../src/config/env.js';
import { connectDatabase } from '../src/config/database.js';
import { createModels } from '../src/models/index.js';
import { MongoRepository } from '../src/repositories/mongoRepository.js';
import { ingestSource } from '../src/services/sourceIngestionService.js';
let connection;
try {
  const env = loadEnv(); connection = await connectDatabase(env.MONGODB_URI);
  const repo = new MongoRepository(connection, createModels(connection)); await repo.initialize();
  const counts = {}, input = createInterface({ input: createReadStream(resolve(process.argv[2] || 'data/pending-sources.ndjson')), crlfDelay: Infinity });
  for await (const line of input) if (line.trim()) { const result = await ingestSource(repo, JSON.parse(line)); counts[result] = (counts[result] || 0) + 1; }
  console.info(JSON.stringify({ event: 'ingest_completed', counts, automaticApproval: false }));
} catch { console.error('Source ingestion failed. Check configuration and input schema. Completed rows are safe to re-import; none were automatically approved.'); process.exitCode = 1; }
finally { await connection?.close(); }
