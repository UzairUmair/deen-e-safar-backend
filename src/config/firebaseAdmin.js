import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
export function adminCredential(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return applicationDefault();
  try {
    const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (account?.type !== 'service_account' || account.project_id !== env.FIREBASE_PROJECT_ID ||
        typeof account.client_email !== 'string' || !account.client_email ||
        typeof account.private_key !== 'string' || !account.private_key) throw new Error();
    return cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key });
  } catch {
    // JSON and SDK parsing errors can contain secret values: never propagate them.
    const error = new Error('Configure: FIREBASE_SERVICE_ACCOUNT_JSON');
    error.code = 'CONFIG_INVALID';
    throw error;
  }
}
export async function initializeAdmin(env) {
  const app = getApps().find(a => a.name === 'deen-backend') || initializeApp({
    projectId: env.FIREBASE_PROJECT_ID,
    ...(env.FIREBASE_AUTH_EMULATOR_HOST ? {} : { credential: adminCredential(env) }),
  }, 'deen-backend');
  if (!env.FIREBASE_AUTH_EMULATOR_HOST) await app.options.credential.getAccessToken();
  return getAuth(app);
}
