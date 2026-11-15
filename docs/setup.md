# Standalone setup

The application repository is its own project root. No parent workspace files are
required for installation, tests or runtime. Historical reports in this directory
describe the original implementation; paths in the repository README are current.

## Production configuration

Frontend: copy .env.example to .env.local and enter Firebase web configuration
under NEXT_PUBLIC_FIREBASE_* plus NEXT_PUBLIC_API_BASE_URL (HTTPS API origin,
without /api). These web identifiers are public. Rebuild after changing them.
Never include Admin credentials, MongoDB passwords or Groq keys in browser values.
The static output is out/; hash routes stay within the existing static frontend.

Backend: copy .env.example to .env securely. Set a freshly rotated MONGODB_URI
and FIREBASE_PROJECT_ID matching the frontend (deen-e-safar for the supplied
project). Use Firebase Admin ADC/workload identity, or GOOGLE_APPLICATION_CREDENTIALS
pointing to a protected JSON file outside the repository. Allow the API host in
Atlas networking; use a database user restricted to deen_e_safar. Local MongoDB
must be a replica set. CLIENT_ORIGIN is a comma-separated list of exact frontend
origins, without paths or wildcards. Production requires HTTPS. Configure
TRUST_PROXY_HOPS for the actual host topology.

For optional generation, configure a newly rotated GROQ_API_KEY and a currently
supported GROQ_MODEL. GROQ_RESPONSE_FORMAT=json_object is the default; select
json_schema only for a model supporting strict structured output. Leave Groq
empty to keep account features available without generated answers. Credentials
previously pasted into chat were not used and must not be reused.

In Firebase Console, enable Email/Password and Google in Authentication → Sign-in
method; set the Google support email and authorized frontend domains. Configure
password policy and enumeration protection. Configure email templates; a custom
action URL may point to the frontend root, which handles mode/oobCode parameters.
Otherwise use Firebase's hosted handler and refresh verification from Account.
Check real email delivery and Google consent separately in the live project.

Only trusted operators may run the backend admin:claim script. Never grant roles
from browser data or email comparisons. Source ingestion starts pending and
unverified; qualified reviewers must check exact text, edition, rights and
attribution before approval. Structural citation checks cannot prove semantic
entailment or replace scholarly review. History defaults off. No live database,
production Google sign-in or Groq generation is implied by local tests.

## Local integration check

Clone both repositories into separate folders. The following terminals are
independent; run only one emulator on port 9099.

From the frontend repository:

```powershell
npm ci
npx --yes firebase-tools emulators:start --only auth --project demo-deen-e-safar --config firebase.emulators.json
```

From the backend repository in a second terminal:

```powershell
npm ci
$env:NODE_ENV='development'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
$env:FIREBASE_PROJECT_ID='demo-deen-e-safar'
node scripts/emulator-backend.js
```

From the frontend repository in a third terminal:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:4001'
$env:NEXT_PUBLIC_FIREBASE_API_KEY='demo-emulator-public-key'
$env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN='demo-deen-e-safar.firebaseapp.com'
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID='demo-deen-e-safar'
$env:NEXT_PUBLIC_FIREBASE_APP_ID='1:123:web:demo'
$env:NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL='http://127.0.0.1:9099'
npm run dev -- --port 3100
```

Then run npm run verify:auth from another frontend terminal. The script clears
users only in the local fake project and reads local test email action codes.
It uses installed Chrome or CHROME_PATH. Stop the processes afterward and keep
emulator variables out of production builds. Production rejects emulator use.

For deployment, the frontend uses npm run build and publishes out/. The backend
has a non-root Docker image and its own Render blueprint. Mount Admin secrets or
use workload identity, configure HTTPS/CORS and Atlas access, then perform live
acceptance checks. Pushing repositories does not deploy or configure live services.
