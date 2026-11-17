# Academy API

Existing `{data: ...}` and `{error:{code,message,requestId}}` envelopes apply.
Clients cannot supply UID, role or score. IDs containing `academy:` should be URL encoded.

## Public reads

Explicit CORS and IP limits still apply.

| Route | Behavior |
| --- | --- |
| GET /api/academy/tracks | Seven tracks and editorial outlines; no AI call |
| GET /api/academy/tracks/:id | Track with its lessons |
| GET /api/academy/lessons/:lessonId?language=en | Outline, per-step coverage, providerConfigured |
| GET /api/academy/sources/:sourceId | Approved/license-approved source and public attribution only |
| GET /api/academy/topics?q=... | Bounded EN/Urdu/Roman Urdu aliases or null; no AI call |

Availability means mapped source coverage, not an expert-certified course.

## Owner-authenticated operations

Bearer Firebase ID token and owner-scoped queries throughout.

- GET /api/academy/sessions: up to 100 recent owner academy rows.
- POST /api/academy/sessions: `{lessonId,language,difficulty,mode}`. Idempotent
  resume per owner/lesson; existing state takes priority.
- GET /api/academy/sessions/:id: position/note/preferences/version. Assessment
  exposes only id/question/options, not its answer key before submission.
- PATCH /api/academy/sessions/:id: `{action,expectedVersion,language,difficulty,
  mode,note?}`. action next|previous|save|finish. Position is clamped; finish
  requires final step. A stale version returns 409.
- POST /api/academy/sessions/:id/explain: `{action,language,difficulty,mode,
  quizKind?,question?,context?}`. Actions explain|simple|detail|example|summary|
  question|feedback|quiz. question required for question/feedback. Context is at
  most four untrusted prior question/answer pairs of 1000/2000 characters. Private
  context is rejected on cacheable actions. quizKind mcq|true-false. Verified email
  and persistent AI quotas required. Insufficient sources return generated:false;
  provider/configuration/timeout/quota/invalid-output failures return safe errors.
- POST /api/academy/sessions/:id/quiz: `{assessmentId,answers:[index],submissionId}`.
  Ownership, step, assessment ID and current source hashes are checked. Returns
  score,total,correct,explanation after scoring. Idempotent submission IDs. Quiz
  generation increments session version; clients refresh it before the next write.
- POST /api/academy/import: `{consent:true,lessons:[{lessonId,currentStep,status,
  note,language,difficulty}]}`. Up to100 known lessons; notes max4000 characters.
  Existing account rows take priority. Repeat import is idempotent; device data stays.

Languages en|ur|roman-ur; difficulties beginner|intermediate|advanced; modes
guided|ask|story. Defaults en/beginner/guided. Save/Continue/Previous/Finish persist
position, preferences and notes. Language switching retains current position.

Teaching returns lessonId,title,stepNumber,totalSteps,learningObjectives,
explanation,keyTerms,keyPoints,uncertaintyNotes,limitations,sourceReferences,
knowledgeCheck,nextStepAvailable,generated. Zod/reference validation precedes plain
React text rendering. Academy Q&A stays in tab memory; existing opt-in persistent
chat, learning-progress and quiz-attempt consumers retain their contracts.


## Source-review extension (existing administrator API)

POST /api/admin/sources accepts exact source text/provenance and optional
academyScopes:[{lessonId,stepId}]. New or changed input is pending/unverified;
identical resubmission is idempotent. It cannot accept reviewStatus, reviewer or
license claims. PATCH /api/admin/sources/:id/review retains the separate existing
contentHash/license/note approval contract. Public lesson detail steps now include
sourceReferences for eligible exact-pair assignments. Existing pinned Quran/Hadith
references remain required. No server-side fetching of proposal URLs occurs.
