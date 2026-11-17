# AI assistant audit — 17 November 2026

The independent frontend is Next.js/React/TypeScript with hash routing; backend is Express/Firebase Admin/MongoDB/Groq. Existing aiService, SourcePassage, AIConversation/AIMessage, quotas and citation validator are reused.

Confirmed frontend root cause: IslamicAI mounted CloudAssistant only if signed in AND /api/health reported generatedAI. Otherwise it showed a literal bundled-source search with the misleading permanent coming-soon headline. A transient public health request returned 503; a subsequent direct request returned 200, accounts=true and generatedAI=false. That aggregate capability requires database readiness, provider configuration and at least one approved/licensed source. It does not identify which of the latter two is absent in production, so neither missing keys nor missing sources is asserted as a confirmed production cause.

Confirmed service issues: all messages entered retrieval, including greetings; unsaved chats supplied no prior context; retrieval used limited lexical terms and only the prior question; source approval was not rechecked after provider generation. Saved conversation CRUD and owner checks already existed. Authenticated generation requires verified email and durable quotas; guest generation is not authorized by the existing policy.

Live local Groq SDK/service/citation smoke passed with the supplied backend-only key and controlled software-test evidence. No production MongoDB passage was approved or changed. The key is stored only in ignored backend .env and is not deployed. Since the key was pasted in chat, revoke it after testing and replace it securely. Production end-to-end educational answers remain unverified.
