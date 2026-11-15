# Backend ERD

ObjectId relations are scoped by the verified owner's internal user ID. Compound unique indexes enforce idempotency; timestamps, versions and deletion status are server-owned. No passwords are stored.

```mermaid
erDiagram
 USERS ||--o{ BOOKMARKS : owns
 USERS ||--o{ READING_PROGRESS : resumes
 USERS ||--o{ LEARNING_PROGRESS : studies
 USERS ||--o{ QUIZ_ATTEMPTS : submits
 USERS ||--o{ AI_CONVERSATIONS : starts
 USERS ||--o{ CONTENT_REPORTS : reports
 USERS ||--o{ RATE_BUCKETS : limits
 AI_CONVERSATIONS ||--o{ AI_MESSAGES : contains
 AI_MESSAGES }o--o{ SOURCE_PASSAGES : cites
 USERS {
  ObjectId _id PK
  string firebaseUid UK
  string name
  string email
  string role
  string status
  object preferences
  number version
  date createdAt
 }
 BOOKMARKS {
  ObjectId userId FK
  string contentType
  string contentRef
  date createdAt
 }
 READING_PROGRESS {
  ObjectId userId FK
  number surahNumber
  number ayahNumber
  number version
  date updatedAt
 }
 LEARNING_PROGRESS {
  ObjectId userId FK
  string courseId
  string lessonId
  string status
  string note
  date lastAccessedAt
  date completedAt
 }
 QUIZ_ATTEMPTS {
  ObjectId userId FK
  string quizId
  array answers
  number score
  number total
  string submissionId
 }
 AI_CONVERSATIONS {
  ObjectId userId FK
  string title
  date updatedAt
 }
 AI_MESSAGES {
  ObjectId userId FK
  ObjectId conversationId FK
  string role
  string content
  array sourceRefs
 }
 SOURCE_PASSAGES {
  string sourceId UK
  string sourceType
  string collection
  string reference
  string language
  string text
  string sourceURL
  string edition
  string reviewStatus
  object licenseMetadata
  array terms
 }
 CONTENT_REPORTS {
  ObjectId userId FK
  string targetType
  string targetId
  string reason
  string status
 }
 RATE_BUCKETS {
  ObjectId userId FK
  string scope
  number window
  number count
  date expiresAt
 }
```
