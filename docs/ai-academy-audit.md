# AI academy audit — 16 November 2026

The deployed applications have independent repositories: a static-export Next.js
React/TypeScript frontend with hash routes, and Express 5/Mongoose backend.
No framework migration or duplicate backend is needed.

Frontend: Learn.tsx exports 15 introductory lessons and five paths, with legacy
numeric lesson IDs, device/UID-scoped notes and completion. CloudAssistant uses
backendRequest, account auth, citations and opt-in conversation history. The app
uses i18next, cream/navy/gold tokens, AnimatedButton and reduced-motion styles.

Backend: aiService retrieves only approved and license-approved SourcePassages,
uses the configured Groq provider, validates source IDs, applies Firebase verified
identity and persistent minute/day quotas. LearningProgress and QuizAttempt
already enforce owner scope; source ingestion defaults pending/unverified and
admin reviews bind to contentHash. Account deletion removes these collections.
There is no approved historical corpus checked into this repository. Production
health previously reported generatedAI false because reviewed evidence was absent.

Missing: academy track catalog, explicit step state, per-step evidence mappings,
Roman Urdu, teaching actions, generated assessments with server scoring, session
restoration, and focused workspace. Reuse the provider, auth, repository,
LearningProgress, QuizAttempt, review gates and citation validator. Extend progress
rather than creating parallel user/session collections. Preserve old lesson IDs,
legacy consumers and guest import consent. New editorial outlines are never
represented as expert-approved historical content. Human scholarly and license
review cannot be replaced by tests or model confidence.
