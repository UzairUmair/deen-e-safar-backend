import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

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
