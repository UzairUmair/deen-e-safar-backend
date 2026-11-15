# Frontend/backend folder separation

Next.js moved from the repository root into frontend/. Express moved from
server/ into backend/. Each application has its own package.json, lockfile,
dependencies, environment example and tests. The root package contains command
shortcuts and no application dependencies.

Frontend source, assets, content snapshots, design references, tests, browser
scripts and framework configuration live in frontend/. Its static export is
frontend/out/. Set frontend as the static host's project root and out as its
publish directory.

The backend's runtime, generated catalog, tests, scripts and Dockerfile live in
backend/. The Render blueprint uses that directory as its Docker context.
Runtime code imports no frontend files; only source preparation and integration
fixtures read sibling frontend data.

Shared documentation and Firebase emulator configuration remain at the root.
The credential scanner stays in scripts/ and checks the full repository even
when invoked from frontend/. Motion evidence still writes to shared docs/.

```sh
npm run setup
npm run dev
# Separate terminal:
npm run dev:backend
```

Alternatively, run npm ci and npm run dev within either application folder.
Browser configuration belongs in frontend/.env.local; API secrets belong in
backend/.env. Existing private files in the former server directory move with
backend/. Root test:server remains an alias for test:backend.

After the move: 93 frontend tests, 22 backend tests, lint, typecheck, source
fidelity, catalog generation and pending-source preparation pass. All 22 existing
application browser checks and the production export pass from the separated
frontend root. The ignored old root
dependency/build caches are retained; they are not used by these commands.
