# Backend implementation report

Implemented on **codex/backend-integration**. The static Next.js frontend, hash routing, public Quran/prayer providers, guest access and homepage 3D architecture are retained. Express is separate in backend/. Nothing was deployed, and the supplied private key was neither used nor stored.

## Architecture

Firebase's modular web SDK handles email/password and Google identity, verification, reset, provider linking, persistence and reauthentication. Express receives ID tokens; Firebase Admin verifies project/audience/issuer and revocation. A unique Firebase UID creates or loads one MongoDB profile. The browser cannot choose an owner or admin role. Admin access requires a verified custom claim set through an operator-only CLI.

The account adapter intercepts the existing guest services and legacy learning/Hadith stores. Private cloud snapshots and unsent changes live in memory under the current UID. Switching accounts/logout aborts requests and clears private snapshots, queued writes and route state. Public query caches remain reusable. Firebase manages persisted login state; logout clears its SDK session. Remaining local tools such as reminders have UID-specific browser keys and never enter guest backups.

The server validates allowlisted inputs and real Quran/lesson references, scores quizzes from the existing catalog, limits payloads, applies exact-origin CORS and Helmet, and returns safe structured errors. Unique indexes/idempotency keys handle repeated writes; version conflicts are explicit in the UI. Private mutations serialize against deletion. Recent-auth deletion purges owned records before deleting Firebase identity. Admin failures leave normal access closed with a retryable deletion state.

Guest import is opt-in, transactional and repeatable. It unions references/completions, preserves existing account positions/notes/preferences and retains the original guest copy. It never trusts browser quiz scores. Failed cloud edits remain in the tab for explicit retry; this is not a durable offline client.

See the [ERD](backend-erd.md), [flow](backend-flow.md), [audit](backend-audit.md), [API contract](api-contract.md) and [secure setup/deployment guide](backend-setup.md).

## MongoDB collections

These collections and indexes were created and exercised in isolated local MongoDB replica sets. **No Atlas database was contacted or created.** Configured production startup creates the same schemas in the deen_e_safar database.

| Model | Collection | Purpose |
| --- | --- | --- |
| User | users | Unique Firebase UID, profile, trusted role, preferences, deletion state |
| Bookmark | bookmarks | Owner-scoped Quran/Dua/Hadith references |
| ReadingProgress | readingprogresses | Per-surah reading position and version |
| LearningProgress | learningprogresses | Known lesson/course, completion and notes |
| QuizAttempt | quizattempts | Server score and unique submission ID |
| AIConversation | aiconversations | Private title and version |
| AIMessage | aimessages | Private messages and stable source references |
| SourcePassage | sourcepassages | Exact text, edition, grading, hash, review and licensing |
| ContentReport | contentreports | Owned report target, reason and review state |
| RateBucket | ratebuckets | Durable owner AI quotas with TTL |

Compound ownership/reference indexes, unique user/bookmark/submission indexes, message cursors, lexical source indexes and TTL indexes are implemented. Relations are application enforced. The publisher collection field follows the supplied source schema; Mongoose emits its reserved-path advisory. Repository reads use lean records, not that document property as a database collection handle.

## HTTP endpoints

- Public health/capabilities: GET /api/health.
- Identity/profile: POST /api/auth/sync; GET/PATCH/DELETE /api/users/me; POST /api/users/me/guest-import.
- Bookmarks: GET/POST /api/bookmarks; DELETE /api/bookmarks/:id.
- Reading: GET /api/reading-progress; GET/PUT /api/reading-progress/:surah.
- Learning: GET /api/learning-progress; PUT /api/learning-progress/:lessonId.
- Quizzes: GET/POST /api/quiz-attempts.
- AI: POST /api/ai/chat; GET/POST /api/ai/conversations; GET/PATCH/DELETE /api/ai/conversations/:id.
- Reports: POST /api/content-reports.
- Admin: GET/POST /api/admin/sources; PATCH /api/admin/sources/:id/review; GET /api/admin/reports; PATCH /api/admin/reports/:id.

Lists use bounded ObjectId cursor pagination. Request shapes, errors, conflicts, idempotency and placeholder examples are in the API contract.

## Firebase authentication status

**Tested locally:** real Firebase web SDK signup/login, persistence across navigation, verification, password reset, simulated Google popup, Admin token verification, protected routes, logout and reauthenticated deletion passed against Firebase Auth Emulator and temporary MongoDB. Controlled frontend tests also cover Google provider conflicts and backend-sync failure without losing the Firebase identity.

Production Email/Password and Google provider switches, authorized domains, email delivery, real Google consent and service-account access were not tested against deen-e-safar. They remain Console/runtime setup; public browser configuration alone cannot authorize the backend.

## Groq and source status

**Tested with controlled transport:** the official Groq SDK receives the configured model, structured output, timeout and output cap. API tests cover grounded output, missing evidence, invalid JSON, fabricated citation IDs/references, safe provider errors, history privacy and quotas. **No live Groq generation occurred.** A rotated key, supported model and reviewed/licensed sources are required.

Prepared 19,071 pending Quran/Hadith records from the existing snapshot, preserving text and edition metadata, into ignored local data. No production religious or licensing approval was invented. Ingestion accepts no review fields, preserves unchanged reviews and invalidates approval when content/metadata changes. Approval is bound to the exact content hash. Only approved/licensed passages enter bounded lexical retrieval. Citation text, grading, attribution and links come from server records.

The labelled source search remains available to guests and unconfigured generation. Generated explanations have an explicit label and citations. History defaults off; saved conversations support continuation, rename, pagination, deletion and reporting. Reporting an individual answer requires a saved message ID. Missing evidence/citation failure returns a limited answer without storing unverified generated output.

## Frontend files

- frontend/app/context/AuthContext.tsx; frontend/app/lib/firebaseConfig.ts and firebaseClient.ts; frontend/app/services/account/authTypes.ts, backendClient.ts, accountStore.ts, legacyStorage.ts and guestImport.ts.
- frontend/app/hooks/useLegacyStored.ts; guest service interception in frontend/app/services/guest/guestStorage.ts and frontend/app/features/shared.tsx.
- New frontend/app/screens/Account.tsx and CloudAssistant.tsx; account-aware Dashboard, Bookmarks, Preferences, IslamicAI and citation types.
- frontend/app/page.tsx and frontend/app/lib/router.ts for routes, header/drawer links, route gates, identity resets and discovery quiz submission.
- frontend/app/features/Learn.tsx for quiz submission/note bounds; translations.json for English/Urdu/Arabic account/AI text; scoped account CSS.
- Dependency locks, ESLint/TypeScript settings, new tests, functional-check VM's isolated empty environment, placeholder environment file and ignore rules.

## Backend and tooling files

- backend/src/config/: env, database, firebaseAdmin, groq and catalog modules; strict validation.js; models/index.js; repositories/mongoRepository.js.
- backend/src/services/: user, account, guest migration, retrieval, citation validation, Groq and source ingestion modules.
- backend/src/middleware/security.js; routes/api.js; utils/apiError.js; app.js; server.js.
- backend/tests/api.test.js; independent package/lock; placeholder environment file.
- Source preparation/ingestion, admin claims, explicit live smoke and loopback-only emulator harness scripts; generated trusted catalog and synchronization script.
- frontend/scripts/verify-auth.mjs; scripts/check-secrets.mjs; firebase.emulators.json; backend/Dockerfile and .dockerignore; render.yaml; backend documentation.

## Validation

| Check | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript | Passed |
| Production static export | Passed |
| Frontend Vitest | **93 passed**, no skips |
| Backend Node/Supertest with real temporary MongoDB | **22 passed**, no skips |
| Content/source fidelity | Passed: 114 surahs, 6,236 verses, 19 Duas, 121 Hadith, 15 translated lessons |
| Existing application browser suite | **22 passed** |
| Existing homepage/global 3D browser suite | **12 passed** |
| Local Firebase emulator browser suite | Passed, including simulated Google and responsive English/Urdu account UI |
| Root dependency audit, including development packages | **0 vulnerabilities** |
| Server dependency audit | **0 vulnerabilities** |
| Credential scan / diff whitespace checks | Passed |

Tests cover invalid/expired/revoked/wrong-project tokens; UID/role injection; ownership; uniqueness; verse bounds; conflicts/idempotency; transactional import rollback; trusted quiz scores; exact-revision source approval; retrieval licensing; safe errors; quotas; pagination boundaries; failed Admin deletion; and deletion during an in-flight AI request. Browser public providers use recorded fixtures. Live public-provider checks were not rerun for this backend change.

The root lock includes scoped overrides for patched @grpc/grpc-js and minimatch, plus an ESLint update; lint, tests and build passed with these versions. Firebase CLI was invoked separately through npx for the emulator and is not an application dependency.

## Limitations and manual setup

1. Configure a freshly rotated Atlas URI/password, Firebase Admin ADC identity, and freshly rotated Groq key/model securely. The supplied Mongo URI has a password placeholder. Actual environment files and Admin credentials were not created from pasted secrets.
2. Complete Firebase provider/domain/template configuration and production acceptance checks using the setup guide. Production login, delivery, real Google consent, Atlas and Groq remain unverified.
3. Qualified reviewers must verify source content, grading, rights and attribution. Lexical retrieval has no embedding/vector service. Structural citation checks cannot prove semantic entailment or replace scholarly review.
4. Unsent cloud edits are in memory only. The UI exposes failures/conflicts and retry/discard choices; closing the tab or signing out loses unsent edits. Reminders/local tools are UID scoped but not cloud synchronized. Guest import has payload limits and excludes claimed scores/preferences.
5. Deletion is recoverable after upstream Admin failure: normal access remains closed and the user can reauthenticate/retry. A Firebase outage may require operator assistance.
6. AI quotas are durable across API instances; the coarse IP limiter is per process. Add host-level protection or a shared limiter for multiple replicas. Audit events are safe console events, not an immutable compliance log.
7. Docker/Render/static hosting configuration is prepared only. Mount Admin credentials or use workload identity, restrict Atlas networking, configure HTTPS/CORS/proxy trust and frontend CSP, deploy, then perform explicit live smoke checks. No cloud resources or production permissions were changed.

No old secret was used, stored in public variables, committed or sent to an integration. Examples contain placeholders. The backend branch contains the implementation for review.
