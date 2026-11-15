# Deen e Safar — Backend

Independent Node.js / Express 5 / Mongoose API. Firebase Admin verifies identity;
MongoDB stores account data; Groq generates source-grounded explanations only when
configured with approved, licensed evidence.

Frontend: [deen-e-safar](https://github.com/UzairUmair/deen-e-safar).
No frontend checkout is needed to start this API or run its automated tests.

## Run

Use Node.js 24 LTS (also pinned for Vercel):

```sh
npm ci
# Copy .env.example to .env and configure values securely.
npm run dev
```

The development API uses http://127.0.0.1:4000. Production starts with npm start.
Configure MONGODB_URI, FIREBASE_PROJECT_ID, Firebase Admin application-default
credentials, and the exact CLIENT_ORIGIN. MongoDB requires a replica set (Atlas
provides one). Database name is deen_e_safar. Groq configuration is optional for
account features. Only placeholders are committed; previously pasted private
credentials must be rotated and must not be reused.

## Check

```sh
npm test
npm run check:secrets
```

Tests use temporary MongoDB and controlled Firebase/Groq doubles. The Quran
fixture is included with provenance; tests do not need the frontend repository.
They do not demonstrate live Atlas access, real Google consent or live Groq use.

## Sources and review

Source ingestion starts pending/unverified. To prepare the existing snapshot,
clone the frontend separately and provide its public/content directory:

```sh
npm run sources:prepare -- ../deen-e-safar/public/content
npm run sources:ingest
```

A trusted reviewer must explicitly approve exact source text, licensing and
attribution before retrieval uses it. Use npm run admin:claim -- FIREBASE_UID grant
with secure operator credentials to appoint a reviewer; refresh the user's token.
Account deletion requires recent authentication. AI history defaults off; stored
history and reports are owner scoped. See docs/api-contract.md, docs/backend-erd.md
and docs/backend-flow.md.

## Deploy

Build the Dockerfile with this repository root as Docker context, or use the
included render.yaml. Configure secrets and mount Firebase Admin credentials
securely outside version control. Set production HTTPS origins and verify proxy
trust settings. Nothing is automatically deployed by pushing this repository.

Current configuration and emulator instructions: docs/setup.md. Other historical
reports may refer to the former combined workspace; use this README for current
repository paths.

## Vercel

Use the Express framework preset and the repository root as the project root.
The detected entry point is src/server.js, which directly imports Express and initializes the database and
Firebase Admin before serving requests. It default-exports the Express app for
Vercel; local hosting uses app.listen(). If initialization fails, Vercel returns
a closed 503 handler and the server logs identify the failing startup stage.
The injectable factory is named
src/createApp.js so Vercel does not mistake it for an executable app entry point.

Set production environment variables and Firebase Admin credentials securely in
Vercel before redeploying. The browser Firebase web configuration is not an Admin
credential. Verify /api/health after deployment; the API root / redirects there.
For Vercel, set MONGODB_URI to the full database URI with the actual URL-encoded
database password, FIREBASE_PROJECT_ID=deen-e-safar, and
CLIENT_ORIGIN=https://deen-e-safar-six.vercel.app. Set FIREBASE_SERVICE_ACCOUNT_JSON
as a Vercel Secret containing the complete Admin service-account JSON for that
project (Firebase Console > Project settings > Service accounts). This is an
alternative to file-based ADC; leave GOOGLE_APPLICATION_CREDENTIALS unset for it.
Never use the browser Firebase configuration as the Admin JSON. Redeploy after
changing environment variables. The startup validator reports missing names only.
This entry-point change is checked locally with API tests; a successful live
startup still depends on configured MongoDB and Firebase access.

The scoped jwks-rsa/jose override keeps Firebase Admin compatible with the
Vercel loader, which cannot use Node's require(ESM) support. Remove it only after
the upstream loader compatibility issue is resolved and the runtime test passes:
https://github.com/auth0/node-jwks-rsa/issues/507.
