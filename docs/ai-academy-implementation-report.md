# Academy implementation — 16 November 2026

Implemented in the standalone frontend and backend repositories on local
codex/ai-academy branches. No academy push, deployment, production source approval
or secret change. Existing auth/homepage/Quran/prayer/guest modules remain.

Delivered seven tracks, 36 editorial outlines, 15 source-mapped Quran/Hadith passage
studies and 21 outlines visibly awaiting source/content review. Dashboard includes
search/categories, topic matching, continue/recent learning, real progress counts
and original-library access. Workspace includes responsive outline, exact source
reading, three teaching modes, step controls, explanation actions, key terms,
follow-ups, formative feedback, notes, citations and quizzes in EN/Urdu/Roman Urdu.
Existing diagonal AnimatedButton/visual identity is reused, with dark/reduced
motion and no academy canvas.

Server reuses Groq, configurable model/schema, Zod, Firebase and repository.
It adds mapped retrieval, live source/hash rechecks, insufficient-source refusal,
bounded cache/context/deduplication/timeouts, verified-user quotas, safe errors and
token/duration metrics. Prompt inputs are untrusted data. No generated sacred text.

LearningProgress holds session position/preferences/notes/assessment; QuizAttempt
stores server-scored objective results. Legacy numeric records stay separate.
Owner/deletion rules apply. Guest import requires consent, preserves device data
and gives existing account progress priority. Questions stay in tab memory.

Verified: 121 frontend cases, 34 backend cases, real local SDK/Admin/Mongo browser
integration with controlled Groq fixtures, 30 responsive layouts and existing
content fidelity. See testing report for boundaries and reproduction.

## Remaining release requirements

1. This is not a completed expert-reviewed historical curriculum. A licensed,
   scholar-reviewed Seerah/Sahaba/history corpus and evaluated outlines are needed.
   No fabricated biography or battle narrative fills those gaps.
2. Sources remain pending until human content/licensing review. New publishers
   require a reviewed allowlist change; no source was automatically approved.
3. No live academy Groq smoke was run. Official model/schema docs were checked;
   provider transport and validation were tested using controlled fixtures.
4. Q&A has current lesson/step and four bounded prior turns, not unlimited memory.
   Existing persistent chat remains opt-in through its established endpoints.
5. Reading-time estimates are omitted. Caches are per instance; token metrics do
   not pretend to be exact monetary costs. Real mobile/Safari remain unverified.
6. Obtain explicit approval before publishing. Deploy backend first, then frontend,
   preserve production Firebase/CORS/API config, approve eligible evidence, and
   perform a separately reported live tutor smoke and expert evaluation.

The source-grounded workflow is implemented. Scholarly content, live provider
verification and publication are explicitly unfinished.


Final packaging: Node 24 production static build passed; frontend typecheck/lint
passed; existing application browser suite 22/22 and homepage/UI suite 12/12
passed. Both repository secret scans and whitespace checks passed. Catalog copies
were compared byte-for-byte. Local test processes were stopped after verification.


Follow-up requested by the user: no publication yet and no repeated dataset
requests. Completed publisher/edition research in ai-academy-source-research.md.
Added runtime reviewed-content assignment and admin proposal/update UI, documented
in ai-academy-content-review.md. Tests cover publication after explicit review,
missing license refusal, regular-user denial, changed-scope revocation, stale
approval rejection and frontend display of runtime historical citations. No
historical text was imported or labelled scholar-verified during this work.
