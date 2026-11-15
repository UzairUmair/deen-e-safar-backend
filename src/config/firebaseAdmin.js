import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
export async function initializeAdmin(env) {
  const app = getApps().find(a => a.name === 'deen-backend') || initializeApp({
    projectId: env.FIREBASE_PROJECT_ID,
    ...(env.FIREBASE_AUTH_EMULATOR_HOST ? {} : { credential: applicationDefault() }),
  }, 'deen-backend');
  if (!env.FIREBASE_AUTH_EMULATOR_HOST) await app.options.credential.getAccessToken();
  return getAuth(app);
}
