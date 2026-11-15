import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Vercel entry exports a closed handler when startup configuration is missing', () => {
  const env = { ...process.env, VERCEL: '1', NODE_ENV: 'production' };
  for (const key of ['MONGODB_URI', 'FIREBASE_PROJECT_ID', 'CLIENT_ORIGIN']) delete env[key];
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import request from 'supertest';
    import app from './src/server.js';
    assert.equal(typeof app, 'function');
    for (const path of ['/', '/api/health', '/api/users/me']) {
      const response = await request(app).get(path).expect(503);
      assert.equal(response.body.error.code, 'SERVICE_UNAVAILABLE');
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.headers['x-powered-by'], undefined);
      assert.equal(JSON.stringify(response.body).includes('MONGODB_URI'), false);
    }
  `], { cwd: new URL('../', import.meta.url), env, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

test('Firebase Admin loads and JWKS signatures work without require(ESM)', () => {
  const result = spawnSync(process.execPath, [
    '--no-experimental-require-module', '--input-type=module', '-e',
    `
      import assert from 'node:assert/strict';
      import { generateKeyPairSync, sign, verify } from 'node:crypto';
      import jwksClient from 'jwks-rsa';
      await import('firebase-admin/auth');
      const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'local-fixture', alg: 'RS256', use: 'sig' };
      const client = jwksClient({ jwksUri: 'https://unused.invalid/keys', getKeysInterceptor: async () => [jwk] });
      const key = await client.getSigningKey(jwk.kid);
      const data = Buffer.from('local signature compatibility fixture');
      const signature = sign('RSA-SHA256', data, privateKey);
      assert.equal(verify('RSA-SHA256', data, key.getPublicKey(), signature), true);
      assert.equal(verify('RSA-SHA256', Buffer.from('changed'), key.getPublicKey(), signature), false);
    `,
  ], { cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
