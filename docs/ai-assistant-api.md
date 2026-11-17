# Assistant API

Existing JSON envelope: {data:...}; safe errors: {error:{code,message,requestId}}. No SSE: complete responses are validated before display.

POST /api/ai/greeting is public, under the existing IP limiter. Body: question (2–2000 chars), language auto/en/ur/roman-ur. Only narrow greetings are accepted; other requests return 401. Responses are deterministic social text, generated=false, citations=[]; no Groq or religious claim.

POST /api/ai/chat retains Firebase token verification, verified email and per-owner quotas. question 3–2000 chars; language auto/en/ur/roman-ur/ar; historyEnabled default false; optional conversationId; optional context of up to eight user/assistant records of at most 2000 characters each. Stored history takes precedence when conversationId is supplied. Client context is untrusted data, never approval or source evidence. The server derives ownership from the token.

Responses: mode generated/limited/greeting, text, citations, generated, optional limitations, intent, lessonId, conversationId, messageId. Generated answers have currently approved retrieved citations. Greeting/fatwa-limitation responses are deterministic. Limited answers invoke no provider when no evidence exists. Guided requests may include a known academy lesson ID even while historical evidence awaits review.

Existing GET/POST /api/ai/conversations, GET/PATCH/DELETE /api/ai/conversations/:id keep owner checks and cursor pagination. Only validated generated pairs are stored when history is enabled; social greetings and limited answers remain temporary. Existing /api/content-reports accepts only owned persisted assistant message IDs. No arbitrary userId accepted.

Stop aborts the HTTP request; Express propagates disconnect cancellation. The UI also guards against late results. Cancellation after a server-side commit does not undo saved history. Provider failures use existing safe 429/503/504 behavior. No citation output is rendered before validation.

Health now exposes providerConfigured and reviewedEvidence booleans alongside the aggregate generatedAI capability; these reveal no credential values and do not prove a successful live provider call.
