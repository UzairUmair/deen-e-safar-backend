# Account and learning redesign test report

Local verification completed 17 November 2026 (Asia/Karachi). No commit, GitHub push or production deployment was performed. Existing academy work and this redesign remain on local codex/ai-academy branches in the independent frontend and backend repositories.

## Actual results

- Frontend Vitest: 121 tests passed across 10 files.
- Backend: 35 tests passed, including lesson-bookmark validation/owner isolation and partial learning-preference merge persistence.
- TypeScript: passed. ESLint: passed without warnings.
- Existing content verification: passed (114 chapters, 6,236 verses, 19 duas, 121 bilingual Hadith, 15 legacy lessons and UI coverage).
- Both secret scans: passed. No credential files or private API keys added.
- Real local Firebase SDK/Admin + temporary MongoDB account flow: passed profile synchronization, signup/login, verification/reset, simulated Google identity, guest import, isolation, logout and recent-auth deletion. This is emulator testing, not a new live Google OAuth test.
- New account/learning browser flow: passed empty-state/counter accuracy, profile edit, learning defaults persisted after reload, lesson preview, bookmark save/open/remove, step restoration, deletion dialog cancellation and sign-out.
- Account responsive checks: 14 layouts (English and Urdu, each at 320, 360, 390, 430, 768, 1024 and 1440px), no horizontal overflow.
- Academy browser integration: passed actual Firebase/Admin/Mongo session operations with controlled Groq fixture answers, follow-up context, MCQ/true-false server scoring, guest import, completion/reload/previous, unavailable-provider behavior and source-review gate.
- Academy responsive checks: 42 layouts (dashboard/workspace, EN/UR/Roman Urdu, seven widths), plus dark and reduced-motion checks. No academy WebGL canvas.
- All seven track image URLs load successfully and are distinct. Thirteen original selected images were visually inspected for people/faces/text; none observed. Responsive crops use object-fit, without stretching.

## Fixes found by tests

The first frontend test run exposed an outdated hero expectation and the jsdom lack of dialog close support when no modal was open; corrected the assertion and only close an open dialog. Added explicit preference selector labels. Browser tests exposed the backend requiring a full learning preference object while the account store sends partial patches; schema and merge logic now accept and preserve validated partial fields. Reload assertions wait for authenticated hydration rather than reading pre-hydration defaults. These failed runs are not counted as successes.

## Scope and remaining review

The 13 WebP assets cover seven distinct track themes and dedicated named historical environments. Other lessons share relevant track artwork; a unique commission for every outline is still outstanding. No missing file placeholder is shown. Profile image upload is not supported by the existing contract, so initials are used. Account counters explicitly measure academy activity; no fake all-time or legacy totals are inferred. Quiz history remains paginated rather than claiming a full total.

Twenty-one historical outlines still await appropriate reviewed, licensed source mappings. Illustration review does not certify historical architecture, geography or narrative authenticity. No scholarly certification, semantic-entailment guarantee, live academy Groq generation or production auth verification is claimed. See academy-source-policy.md and ai-academy-content-review.md.

## Reproduction

Use the loopback demo setup in docs/backend-setup.md, with ACADEMY_TEST_FIXTURES=1 only on the guarded local backend. Then run npm run verify:auth, npm run verify:academy and npm run verify:account-learning. Test browser artifacts are ignored under .openai/account-learning and .openai/academy. Run the production build in a separate shell without demo emulator variables.

## Production build and dependency advisory

The Node 24 production build compiled, passed TypeScript and generated the static pages. Its first run exited with Next.js SecurityFatalError for installed Next.js 16.4.2; the requested retry completed successfully, retaining the upgrade warning. A passing retry does not resolve that advisory. Upgrade to an appropriate patched release before production publication and rerun the build/regression checks. Official advisory index: https://github.com/vercel/next.js/security/advisories . No dependency upgrade was silently bundled into this redesign.

Both repositories passed git diff --check (line-ending normalization notices only). Local demo servers were stopped after verification. The final production build used a separate shell without emulator variables.
