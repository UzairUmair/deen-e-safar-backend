# Backend flow

```mermaid
flowchart TD
 Visit[Existing static Next frontend] --> Guest[Continue as guest]
 Visit --> Login[Email/password or Google via Firebase SDK]
 Guest --> Public[Existing Quran/prayer/content providers]
 Guest --> Local[Original guest localStorage]
 Login --> Token[Firebase ID token]
 Token --> API[Express verifies project, token and revocation]
 API --> User[Idempotent MongoDB profile sync]
 User --> Account[Identity-scoped data adapter]
 Local -. explicit consent only .-> Import[Validated transactional guest import]
 Import --> Account
 Account --> Data[Bookmarks, preferences, reading, learning, trusted quiz scoring]
 Account --> Question[Authenticated, rate-limited AI request]
 Question --> Sources[Approved and licensed lexical retrieval]
 Sources --> Evidence{Evidence available?}
 Evidence -->|no| Limited[Limited answer, no generated claims]
 Evidence -->|yes| Groq[Configured Groq model, bounded JSON output]
 Groq --> Validate[Validate structure and retrieved citation IDs]
 Validate --> Answer[Server-owned citations and labelled explanation]
 Answer -. history enabled only .-> History[Owner-scoped conversations/messages]
 Data --> Mongo[(MongoDB Atlas)]
 History --> Mongo
 Logout[Logout or account switch] --> Clear[Abort requests, discard private caches, restore guest adapter]
```

Auth success and backend sync are separate states. A backend outage preserves the Firebase session and exposes retry. Guests are not redirected away from public features. Deletion requires recent Firebase reauthentication, marks the profile deleting, purges owned data transactionally and deletes Firebase identity; failed deletion remains closed to normal data access and can be retried.
