import { initializeAdmin } from '../src/config/firebaseAdmin.js';
// Operator-only CLI: never infer privileges from an email, profile or browser request.
try {
  const [uid, mode] = process.argv.slice(2);
  if (!uid || uid.length > 128 || !['grant', 'revoke'].includes(mode) || !process.env.FIREBASE_PROJECT_ID) throw Error();
  if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error();
  const auth = await initializeAdmin(process.env), user = await auth.getUser(uid);
  const claims = { ...user.customClaims };
  if (mode === 'grant') claims.admin = true; else delete claims.admin;
  await auth.setCustomUserClaims(uid, claims);
  console.info('Administrative claim updated. The user must refresh their ID token.');
} catch { console.error('Claim update failed. Use: npm run admin:claim -- <firebase-uid> grant|revoke, with trusted Admin credentials and project configured.'); process.exitCode = 1; }
