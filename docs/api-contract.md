# API contract

Base URL is the separately hosted Express service. JSON success: `{ "data": ... }`; list success also includes `meta.nextCursor`. Errors: `{ "error": { "code", "message", "requestId", "details"? } }`. Private endpoints require `Authorization: Bearer <Firebase-ID-token>`. IDs in URLs are validated; ownership is always derived server-side. Pagination uses `?limit=20&cursor=<last-object-id>`, capped at 50.

| Method | Path | Contract |
| --- | --- | --- |
| GET | /api/health | Liveness/readiness and configured capabilities; 503 if DB unavailable |
| POST | /api/auth/sync | Empty body; idempotent verified profile upsert |
| GET/PATCH/DELETE | /api/users/me | Own profile, allowlisted updates, recent-auth account deletion |
| POST | /api/users/me/guest-import | `consent:true`, bookmarks, reading, lessons/notes; transactional, union bookmarks, existing account values win |
| GET/POST | /api/bookmarks | Own bookmarks; create `{contentType,contentRef}`; unique per owner/ref |
| DELETE | /api/bookmarks/:id | Own bookmark only |
| GET | /api/reading-progress | At most 114 own positions, newest first |
| GET/PUT | /api/reading-progress/:surah | `{ayahNumber, expectedVersion?, mutationId?}`; real ayah bounds |
| GET | /api/learning-progress | Own learning records |
| PUT | /api/learning-progress/:lessonId | `{status?,note?,expectedVersion?,mutationId?}`; known lesson/course |
| GET/POST | /api/quiz-attempts | `{quizId, answers, submissionId}`; server scores catalog answers |
| GET/POST | /api/ai/conversations | Own paginated history / create `{title}` |
| GET/PATCH/DELETE | /api/ai/conversations/:id | Own messages (paginated), rename `{title}`, transactional delete |
| POST | /api/ai/chat | `{question,language,historyEnabled:false,conversationId?}`; verified email, quotas, reviewed evidence, validated citations |
| POST | /api/content-reports | `{targetType,targetId,reason}`; AI message must be owned |
| GET/POST | /api/admin/sources | Admin claim only; review queue / proposed source |
| PATCH | /api/admin/sources/:id/review | `{contentHash,reviewStatus,note,licenseMetadata?}`; exact revision and explicit licensing; audited |
| GET | /api/admin/reports | Admin claim only; paginated reports |
| PATCH | /api/admin/reports/:id | `{status,note?}`; audited |

PATCH profile accepts `name`, partial `preferences`, optional `expectedVersion` and `mutationId`. No UID, role, status or arbitrary database fields. Preferences mirror the existing language/theme, Quran display/translation/reciter and prayer location/method/school/clock contracts. Version conflicts return 409, not silent overwrite. Repeating the most recent mutation ID returns the already saved record. Bookmark upserts and quiz submission IDs are idempotent.

Guest import retains all local data. Existing account positions/preferences/notes win; new bookmarks/lesson completions are unioned. Imported timestamps cannot overwrite newer account data. Retrying an import is safe; no partial writes commit. Quiz scores are never imported from browser claims.

AI is generated only with configured Groq and retrieved sources whose review and licensing status are both approved. Missing evidence returns an explicit limited response without invoking the model. Citation failure never returns unverified generated text. History is opt-in; disabling it stores no messages. Rate limits include IP request limits and durable owner quotas for AI. MongoDB transactions require a replica set (Atlas provides one).

Example (placeholder token only):
```sh
curl https://your-api.example/api/bookmarks -H 'Authorization: Bearer <ID_TOKEN>' -H 'Content-Type: application/json' --data '{"contentType":"quran","contentRef":"2:255"}'
```
