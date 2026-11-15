// Explicit operator action only. No old chat credentials, no content or tokens logged.
try {
  if (process.env.RUN_LIVE_SMOKE !== 'true') throw Error();
  const origin = new URL(process.env.SMOKE_API_ORIGIN);
  if (origin.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(origin.hostname)) throw Error();
  if (origin.username || origin.password || !process.env.SMOKE_FIREBASE_ID_TOKEN) throw Error();
  for (const path of ['/api/health', '/api/users/me', '/api/bookmarks?limit=1']) {
    const result = await fetch(new URL(path, origin), { headers: path.includes('health') ? {} : { Authorization: `Bearer ${process.env.SMOKE_FIREBASE_ID_TOKEN}` }, signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!result.ok) throw Error();
    console.info(JSON.stringify({ endpoint: path, status: result.status }));
  }
  console.info('Configured live account smoke checks passed. This does not test Google login, source review or Groq generation.');
} catch { console.error('Live smoke unavailable or failed. Set RUN_LIVE_SMOKE=true, SMOKE_API_ORIGIN and a fresh SMOKE_FIREBASE_ID_TOKEN in a secure local environment.'); process.exitCode = 1; }
