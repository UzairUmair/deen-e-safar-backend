# Islamic AI assistant fix report — 17 November 2026

## Delivered locally

The public /ai entry now opens a conversational welcome screen instead of permanently labelling the assistant as coming soon. Literal bundled search remains a separate mode. Four subject cards and five translated question prompts make real requests. The responsive workspace provides history search/pagination, new/open/rename/delete chats, opt-in history, textarea with Enter/Shift+Enter and IME handling, response-language selection, request cancellation, copy answer/citation, simpler/detail/regenerate follow-ups, reporting for owned saved answers, source cards, and links into the existing academy preview/workspace.

The existing Express aiService/Groq provider now classifies greetings, personal-ruling limits, guided requests and follow-ups. It accepts bounded untrusted context for unsaved chats, uses stored history for saved chats, expands common bilingual retrieval terms and checks source approval/hash again after generation. Source IDs and Quran references are validated before display. Public greetings use a narrow deterministic endpoint under the existing IP limiter. Substantive answers retain Firebase verified-email requirements and durable owner quotas. No duplicate assistant model, provider or history collection was created.

## Confirmed root cause

See ai-assistant-audit.md. The old UI required both login and aggregate generatedAI health readiness before showing chat, and silently substituted a literal source search otherwise. Greetings entered religious retrieval; unsaved follow-ups had no context. Production health initially returned 503, later 200 with accounts=true/generatedAI=false. This demonstrates the readiness gate, but does not prove which production provider/source configuration is missing. More specific health booleans are prepared locally.

## Groq connection

A real call using the supplied key passed through createGroqProvider, aiService and citation validation with a locally authored software-test evidence passage. This verifies real provider transport and structured output only. The test did not read/write production MongoDB or certify any religious/historical answer. The key is in ignored backend .env only; it is not in source, browser storage, public variables, Git or Vercel configuration. Revoke the pasted key after testing and replace it securely.

Official Groq production-model and strict-schema docs were checked. Configurable GROQ_MODEL=openai/gpt-oss-120b was used for the smoke; the service keeps GROQ_MODEL and GROQ_RESPONSE_FORMAT configuration. scripts/smoke-assistant.js reruns the live transport check using private environment configuration and emits no answer or credential values.

## Verification

- Frontend: 121 tests passed; lint, TypeScript and secret scan passed.
- Backend: 36 tests passed; secret scan and diff whitespace checks passed. The backend is JavaScript and has no separate lint/typecheck/build command; node tests import and execute the modules.
- Real local Firebase SDK/Admin + temporary MongoDB browser test passed: guest greeting, signup/email verification, opt-in saved chat, follow-up, rename/reopen/delete, three response languages, academy handoff and 21 chat layouts (320/360/390/430/768/1024/1440 for en/ur/roman-ur).
- Browser provider replies in that test are controlled mocks, separate from the real Groq transport smoke. Final browser run recorded no page errors. Desktop rendered preview was inspected.
- Backend tests cover no-source limits, fabricated citations, provider outages/timeouts, ownership, quotas, review revocation and bounded private context. UI tests cover report submission, source metadata and safe error display.
- Browser iterations found explicit-select-label and async-hydration test issues, plus a real numeric DOMException code bug in authError; corrected. Failed iterations are not counted as passes.

## Limits and release status

No push, commit or deployment for this task. Production readiness and a full live religious-answer browser flow remain unverified. Historical source gaps still require licensed reviewed passages; no biography or Badr chronology is fabricated to satisfy a prompt. Retrieval is bounded lexical ranking with aliases, not embeddings or complete semantic search. Citation validation checks identity/approval, not complete claim entailment.

Non-streaming JSON deliberately waits for validation. Stop aborts the request; cancellation cannot undo a server commit already completed. Greetings and limited answers are not persisted by the existing history policy. Guest conversation state lasts in tab memory; educational generation requires login/verification. History search filters loaded pages; use Load more to extend the searchable list. Copy uses the browser clipboard and shows a failure if unavailable. Native mobile keyboard coverage and clipboard permissions on physical devices were not tested. The mobile history control is an accessible collapsible panel, not a modal drawer. Academy handoff opens the same catalog/session service without duplicating chat messages; existing academy question context remains lesson-scoped.

Next.js 16.4.2 emits a known security-upgrade advisory. This pre-existing dependency needs a patched version before production release. No upgrade was silently bundled into the assistant work.

Production build: Node 24 compiled, passed TypeScript and generated static pages. The first run exited on the Next.js security advisory; the documented retry completed with exit 0 while retaining the warning. The warning remains unresolved. Both repositories pass git diff --check. Local demo processes were stopped. No credential-bearing environment was used in the frontend build.

Short-answer refinement: ordinary questions now request a brief direct explanation before the separate exact translation/source cards. Academy simple/question actions use the same distinction. A real Groq check for “What does the Quran teach us about patience?” returned a short Roman Urdu explanation, a validated Quran 2:153 citation and an unchanged source excerpt. This used the existing local Quran fixture and did not approve production content. All 36 backend tests pass after the refinement.
