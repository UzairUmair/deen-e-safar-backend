# Backend audit

The starting application is Next.js 16 static export, React 19, TypeScript, hash routing, TanStack Query, i18next, Motion and an isolated lazy R3F homepage. There is no Express server, Firebase SDK, account context or connected model. `auth` currently redirects to the guest dashboard. Existing public Quran and prayer adapters must remain unchanged.

Guest bookmarks, one last reading position and preferences use versioned `Store<T>` objects in `frontend/app/services/guest`. Reader writes use those services directly, so an identity-scoped adapter belongs at that boundary, not inside individual verse components. `useStored` still owns legacy lesson completions, lesson notes, Hadith bookmarks and local reminders. Account state must never be written into the guest namespace. Guest import must explicitly select the original guest copy and retain it after success.

There are 114 surahs / 6,236 ayahs, 19 Duas, 121 Hadith records and 15 authored lessons. Trusted bounds and quiz answer keys will be generated from those existing files. Bundling source text is not evidence of a new ingestion's religious or licensing approval: proposed RAG material starts pending and is excluded until both checks pass.

The assistant currently performs labelled literal source search. Preserve it for guests and unconfigured services. Generated explanations require verified Firebase identity, reviewed evidence, bounded Groq requests and server-owned citation metadata. Account history is opt-in.

Keep the frontend statically exportable. Add a separate ES-module Express application in `backend`, with Mongoose persistence and Firebase Admin verification. Public Firebase web configuration may be bundled; MongoDB, Admin credentials and Groq keys remain server-only. Shared private credentials are not used. The supplied MongoDB URI has a password placeholder; live MongoDB, Admin and rotated Groq configuration remain operator setup.

Existing checks: lint, typecheck, build, Vitest, content verification and Playwright application/homepage suites. Add isolated MongoDB API/security tests, mocked Firebase/Groq tests and identity-switch frontend tests. Live tests remain separately configured. No homepage geometry, motion architecture, provider API or routing migration is required.

References consulted: [Next environment variables](https://nextjs.org/docs/app/guides/environment-variables) (also installed bundled guide), [Firebase modular setup](https://firebase.google.com/docs/web/setup), [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Express 5 errors](https://expressjs.com/en/guide/error-handling.html), [Mongoose atomic updates](https://mongoosejs.com/docs/tutorials/findoneandupdate.html), [Groq structured output](https://console.groq.com/docs/structured-outputs), [Zod schemas](https://zod.dev/api).
