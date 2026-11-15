# Backend setup and deployment

The public site still works as a guest without account configuration. New code does not make the production integrations live automatically. Never reuse credentials previously pasted into chat. Rotate the Groq key and any previously disclosed database password through their consoles; enter replacements only in local ignored environment files or deployment secrets.

## Local application

Use Node.js 22 or 24 LTS. Run `npm run setup` at the repository root, or install each app independently with `npm ci --prefix frontend` and `npm ci --prefix backend`. Copy `frontend/.env.example` to `frontend/.env.local` and `backend/.env.example` to `backend/.env` using your editor. Both actual files are ignored; examples contain placeholders.

Frontend public settings go in `frontend/.env.local`: `NEXT_PUBLIC_API_BASE_URL` is the API's origin (no `/api` suffix). Copy the Firebase **web app** config from Firebase Console → Project settings → Your apps into the corresponding `NEXT_PUBLIC_FIREBASE_*` fields. The intended project is `deen-e-safar`; these are public identifiers, not Admin credentials. Restart Next after changing environment values; production static exports embed them at build time.

In `backend/.env`, set:

| Variable | Secure configuration |
| --- | --- |
| `MONGODB_URI` | Atlas Drivers connection string using a new database password, URL encoded. Database is always `deen_e_safar`. Do not leave angle-bracket placeholders. |
| `FIREBASE_PROJECT_ID` | Same Firebase project as the browser app (`deen-e-safar` for the supplied project). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to a Firebase Admin service account JSON stored **outside the repository**, or use application default credentials/workload identity on a supported host. Never use the browser API key as an Admin credential. |
| `CLIENT_ORIGIN` | Exact comma-separated frontend origins, e.g. `http://127.0.0.1:3000`; no trailing slash, paths or wildcard. |
| `GROQ_API_KEY` | Freshly rotated server-only key. Leave blank to keep generation unavailable. |
| `GROQ_MODEL` | A currently supported model enabled for that Groq account. Select using the official Groq model documentation/console; no retired model is hardcoded. |
| `GROQ_RESPONSE_FORMAT` | `json_object`, or `json_schema` only for a model supporting strict structured output. Both are validated again server-side. |
| `TRUST_PROXY_HOPS` | `0` for direct local access; match the verified proxy topology when hosted. Do not trust arbitrary forwarded addresses. |

In separate terminals run `npm run dev:backend` and `npm run dev`. The API listens on loopback port 4000 in development. `/api/health` reports account readiness and generated-answer capability. Database or Admin initialization failures prevent startup and log a safe configuration message. Missing Groq configuration leaves account features usable. The backend uses transactions: local MongoDB must run as a replica set; Atlas already supplies one.

## Firebase Console

1. Open Authentication → Sign-in method. Enable **Email/Password** and **Google** for the intended project; set Google's support email. Configure a suitable password policy and email enumeration protection.
2. In Authentication → Settings → Authorized domains, add the exact development and production frontend domains you control. A localhost entry may need to be added explicitly. Google sign-in uses the modular popup flow; the UI handles popup blocking and provider conflicts.
3. Configure verification and password-reset email templates. To use the application's custom handler, set the action URL to the frontend root, e.g. `https://your-site.example/`. It accepts Firebase `mode` and `oobCode` query parameters and forwards them into the hash route. Keep Firebase's hosted handler if preferred, then use **I have verified my email** in Account. Do not send action codes to logs or analytics.
4. Create a least-privilege Admin runtime identity and supply it securely through ADC. Admin SDK token verification checks signature, audience, issuer and revocation. Never grant an admin role based on email or browser profile data.
5. To appoint a reviewer, run `npm run admin:claim -- <firebase-uid> grant` inside `backend` using trusted operator credentials. Revoke with `revoke`. Refresh the reviewer's token after claim changes. This command preserves other custom claims and is not exposed as an HTTP endpoint.

User passwords are handled only by Firebase's client SDK. MongoDB contains no passwords. Signup, login, verification, reset, linking Google and recent-auth deletion are implemented. Production provider/domain/SMTP delivery and real Google consent must still be checked in your configured project.

## Atlas

Create a database user limited to read/write on `deen_e_safar`; avoid cluster-admin privileges. Allow the API host's egress address through Atlas Network Access, use TLS, and keep the database inaccessible from the frontend. Start the API once to create the ten Mongoose collections and indexes. The API never accepts owner IDs from the browser. Use backups and a deletion/retention policy appropriate for your deployment.

## Source review and AI

Run `npm run sources:prepare --prefix backend` from the repository to prepare 19,071 records from the existing Quran/Hadith snapshot. Text is preserved, with its original edition/reference/URL and Hadith grading/attribution. This writes ignored `backend/data/pending-sources.ndjson`; it does **not** grant content or licensing approval.

Inside `backend`, run `npm run sources:ingest` to load that file, or `npm run sources:ingest -- path/to/file.ndjson`. Each line must match the strict proposed-source schema. Unchanged rows retain their review status. Changes to text or source metadata reset content review **and** licensing to pending/unverified. Ingestion is per-record and restartable; it is not an all-file transaction. Invalid input stops the run safely, with completed rows available for retry.

A reviewer signs in, opens Account → Content review → Review sources, checks the exact source and its edition, rights and attribution, and enters a review note plus an approved license name, URL and attribution. Approval is bound to a content hash so a stale screen cannot approve changed content. Reviewer responsibility includes religious accuracy and actual permission to reuse that edition. Merely being publicly available is insufficient. Rejected and unlicensed sources remain excluded.

Generated answers require a verified email, configured Groq, and retrieved approved/licensed evidence. Without that capability the existing source-search UI remains available. No matching evidence or failed citation checks produce an explicit limited answer. Retrieval is bounded lexical matching, with Arabic/Urdu normalization, not vector search. Citations are resolved from server metadata; structural checks do not prove that every generated claim follows semantically from its sources. Human review and reporting remain necessary. Conversation history defaults off; enabling it stores only validated answers. Saved history, rename, deletion and reporting are owner scoped.

## Local emulator browser verification

This tests the real Firebase web SDK and Admin SDK with a local fake project, plus a temporary real MongoDB replica set. No production credential is needed. The Firebase Auth emulator does not send real email; the test reads local out-of-band codes.

Start these three terminals from the repository in PowerShell (first run may download Firebase CLI and MongoDB's test binary):

```powershell
npx --yes firebase-tools emulators:start --only auth --project demo-deen-e-safar --config firebase.emulators.json
```

```powershell
$env:NODE_ENV='development'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
$env:FIREBASE_PROJECT_ID='demo-deen-e-safar'
node backend/scripts/emulator-backend.js
```

```powershell
$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:4001'
$env:NEXT_PUBLIC_FIREBASE_API_KEY='demo-emulator-public-key'
$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN='demo-deen-e-safar.firebaseapp.com'
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID='demo-deen-e-safar'
$env:NEXT_PUBLIC_FIREBASE_APP_ID='1:123:web:demo'
$env:NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL='http://127.0.0.1:9099'
npm run dev -- --port 3100
```

Then run `npm run verify:auth` in a fourth terminal. Use an installed Chrome or `CHROME_PATH`. The script deletes users **only** in `demo-deen-e-safar` on loopback emulator port 9099. Use a separate terminal environment for normal builds and never export emulator configuration to a production build. Both frontend and server reject emulator use in production. Stop these processes after testing; MongoDB data is temporary. This supplements, rather than replaces, production acceptance checks.

## Deployment preparation

`backend/Dockerfile` builds a non-root Node 24 API image. `render.yaml` supplies an optional Render Docker service blueprint and `/api/health` health check. It is prepared, **not deployed**. Configure secrets through the host and mount an Admin secret file named `firebase-admin.json` at `/etc/secrets/firebase-admin.json`, or adapt the host to use workload identity. The blueprint does not upload or create that file. Set the frontend's exact HTTPS origin and confirm the host's proxy hop count. Production refuses HTTP frontend origins and emulator authentication. Configure HTTPS at the host and restrict Atlas access to the API host.

Host `frontend/out/` on any static host, preserving the existing hash routes, after setting public Firebase/API values and running `npm run build`. MongoDB, Firebase Admin and Groq variables must never be set as `NEXT_PUBLIC_*`. Do not serve the repository or environment files as static content. Configure a frontend CSP appropriate to the existing Quran/audio/prayer providers, Firebase authentication iframe/popup domains and the exact API domain. No frontend Hosting deployment was performed.

For a separately configured live account smoke check, set `RUN_LIVE_SMOKE=true`, `SMOKE_API_ORIGIN`, and a fresh `SMOKE_FIREBASE_ID_TOKEN` privately, then run `npm run smoke:live` in `backend`. It checks health/profile/bookmarks and prints only status codes; it does not verify Groq or Google consent. Complete those deliberately in the deployed UI, review source licenses, check deletion, then remove temporary tokens from your shell.
