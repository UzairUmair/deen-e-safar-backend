# Academy verification — 16 November 2026

- Frontend: 121 Vitest cases in 10 files passed, including eight new academy UI,
  response validation and guest-storage cases.
- Backend: 34 API/security/runtime tests passed, including eight academy cases.
  Supertest uses real temporary MongoDB and controlled providers.
- verify:academy passed with real local Firebase SDK/Admin, Auth emulator and
  temporary MongoDB: guest notes/steps/restoration, email verification, consent
  import, authenticated teaching/follow-up, MCQ/true-false server scoring, three
  languages, provider outage, finish/previous/reload and missing-source refusal.
- Thirty layouts passed: dashboard/workspace × EN/UR/Roman Urdu ×
  320/390/768/1024/1440. Language checks wait for restoration before asserting
  lang/dir. Urdu mobile and dark screenshots were inspected. No academy canvas.
- Content verification passed: 114 surahs, 6,236 verses, 19 duas, 121 bilingual
  Hadith and all 15 original lessons/translations. Secret scanning passed.

Groq integration answers were controlled mocks, explicitly labelled. No live
academy generation or deployment is claimed. No production key was copied into
the test environment. Prior live Google auth verification is not a new academy
OAuth test. Real mobile/Safari and expert factual evaluation remain unverified.

Early harness runs exposed exact-text/implicit-label mismatches and an async
restoration assertion race. Labels became explicit; tests now await restoration
and assert actual learning language. UI review corrected button contrast, dark
selectors, mobile outline collapse and wrapping step controls. Failed iterations
are not counted as passing checks.

## Historical accuracy boundary

No expert-reviewed evaluation set was supplied. Automated source/citation/ownership
tests cannot certify religious correctness. Specialist signoff remains pending:

| Topic | Human review needed |
| --- | --- |
| Prophetic/early Islamic biography | Licensed chronology, dates, report strength |
| Sahaba | Verified attributions and uncertainty; corpus pending |
| Badr/Uhud/Khandaq | Distinguish Quran passages from historical reconstruction |
| Quran | Fidelity tests pass; interpretive accuracy needs review |
| Hadith | Collection, edition, grading and contextual interpretation |
| Disputed details | Supported differences; no universal scoring of contested views |
| Missing evidence | Automated no-generation gate passes; no memory biographies |

## Reproduction

Use existing backend-setup.md emulator instructions with the separate backend
repository. Start Auth emulator demo-deen-e-safar on127.0.0.1:9099. Run backend
scripts/emulator-backend.js with NODE_ENV=development,
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099,
FIREBASE_PROJECT_ID=demo-deen-e-safar and ACADEMY_TEST_FIXTURES=1. This creates only
local test evidence/mock answers. Start frontend3100 with demo Firebase public
config and NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4001; run npm run verify:academy.
The harness refuses non-loopback execution and the backend refuses non-demo
settings. Stop test processes before building without emulator variables.

Final build/regression packaging results are recorded in the implementation report.


Final packaging: Node 24 production static build passed; frontend typecheck/lint
passed; existing application browser suite 22/22 and homepage/UI suite 12/12
passed. Both repository secret scans and whitespace checks passed. Catalog copies
were compared byte-for-byte. Local test processes were stopped after verification.


Follow-up tests: 121 frontend cases and 34 backend cases now pass. New coverage
exercises admin source proposals/invalid JSON/ordinary-user exclusion, dynamic
historical source cards, live lesson/step assignments, required license review,
hash changes and revocation after assignment edits. The fixture text is explicitly
not a historical assertion. These tests do not substitute for scholarly review.

The follow-up also reran verify:auth successfully against the real local Firebase
SDK/Admin emulator: password signup/login/reset, simulated Google popup and
redirect recovery, restored identity/profile, guest import and recent-auth
deletion. verify:academy passed again after runtime source mapping changes.
