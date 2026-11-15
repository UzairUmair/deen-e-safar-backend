import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { adminCredential } from '../src/config/firebaseAdmin.js';

test('Admin JSON accepts a same-project service account without a credential file', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const credential = adminCredential({ FIREBASE_PROJECT_ID: 'demo-config', FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: 'service_account', project_id: 'demo-config', client_email: 'local@demo-config.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  }) });
  assert.equal(typeof credential.getAccessToken, 'function');
});

test('invalid, browser and wrong-project Admin JSON fail without exposing their values', () => {
  for (const value of ['private-input-marker', '{}', JSON.stringify({ apiKey: 'private-input-marker' }), JSON.stringify({ type: 'service_account', project_id: 'other', private_key: 'private-input-marker', client_email: 'local@example.test' }), JSON.stringify({ type: 'service_account', project_id: 'demo-config', private_key: 'private-input-marker', client_email: 'local@example.test' })]) {
    assert.throws(() => adminCredential({ FIREBASE_PROJECT_ID: 'demo-config', FIREBASE_SERVICE_ACCOUNT_JSON: value }), error => {
      assert.equal(error.code, 'CONFIG_INVALID');
      assert.equal(error.message, 'Configure: FIREBASE_SERVICE_ACCOUNT_JSON');
      return true;
    });
  }
});
