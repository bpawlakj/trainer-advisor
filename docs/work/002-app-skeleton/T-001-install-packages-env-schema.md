---
id: T-001
title: Install packages + Zod env schema
status: done
plan: ../plan.md
created: 2026-05-27
completed: 2026-05-28
commit: null
depends_on: []
blocks: [T-002, T-005, T-007, T-009]
plan_anchor: Phase-A
---

## Scope

Install all F-02 runtime + dev packages and create `src/env.ts` Zod schema that fail-fasts on missing env vars. This is the foundation every other F-02 task depends on. Also sync `.env.example`.

## Approach

1. Install runtime packages (Resend dropped — Google handles identity, no app-sent emails in v1):

   ```bash
   pnpm add better-auth drizzle-orm postgres libsodium-wrappers next-intl zod
   ```

2. Install dev packages:

   ```bash
   pnpm add -D drizzle-kit @types/libsodium-wrappers
   ```

3. Create `src/env.ts` (NO `RESEND_*` required — Google-only auth means no app-sent emails in v1):

   ```ts
   import { z } from 'zod';

   const envSchema = z.object({
     APP_URL: z.string().url(),
     SUPABASE_DATABASE_URL: z.string().url(),
     SUPABASE_DIRECT_URL: z.string().url(),
     BETTER_AUTH_SECRET: z.string().min(32),
     BETTER_AUTH_URL: z.string().url(),
     GOOGLE_CLIENT_ID: z.string().min(1),
     GOOGLE_CLIENT_SECRET: z.string().min(1),
     LIBSODIUM_MASTER_KEY: z.string().regex(/^[0-9a-f]{64}$/),
     PG_NET_TOKEN: z.string().min(32),
   });

   export const env = envSchema.parse(process.env);
   ```

4. Update `.env.example` (sync from F-01-era + add F-02 vars):
   - `PG_NET_TOKEN` (generate via `openssl rand -hex 32` placeholder)
   - REMOVE `RESEND_API_KEY` and `RESEND_FROM` if present (no longer needed in v1)
   - Verify the 9 required keys above are listed

5. **All other modules MUST import `env` from `src/env.ts`** — never `process.env` directly. Add a Biome rule or convention note if needed.

## Acceptance

- [x] `pnpm ls better-auth drizzle-orm postgres next-intl libsodium-wrappers zod` returns all with versions (6/6, no `(missing)`) — verified 2026-05-28
- [x] `pnpm ls resend` returns empty (NOT installed — Google handles identity)
- [x] `pnpm ls drizzle-kit @types/libsodium-wrappers --depth=0` shows both as devDependencies (plus `tsx@4.22.3` added for ad-hoc TS script runs — useful tool, ~1 MB)
- [x] `src/env.ts` exists (31 lines) and exports `env` typed via Zod
- [x] Running `node --import tsx/esm -e "import('./src/env.ts')"` with `BETTER_AUTH_SECRET` unset crashes with Zod's named error: `BETTER_AUTH_SECRET: Invalid input: expected string, received undefined` — fail-fast verified
- [x] Same with bad `LIBSODIUM_MASTER_KEY` format → `Invalid string: must match pattern /^[0-9a-f]{64}$/`
- [x] `.env.example` lists the 9 required F-02 keys (verified by grep count) — no `RESEND_*` keys present
- [x] `.env.example` is committed; `.env.local` is gitignored (verified `git check-ignore`)

## Completion notes (2026-05-28)

- Runtime packages installed: better-auth@1.6.11, drizzle-orm@0.45.2, libsodium-wrappers@0.8.4, next-intl@4.12.0, postgres@3.4.9, zod@4.4.3
- Dev packages: drizzle-kit@0.31.10, @types/libsodium-wrappers@0.8.2, tsx@4.22.3 (added for sanity-test script runs against env.ts — not strictly required, but useful enough to keep)
- pnpm build-script approval: `pnpm-workspace.yaml` updated to include `@parcel/watcher`, `@swc/core`, `esbuild` (transitive deps with native compile steps). Standard pnpm 11 dance — without approval, build scripts get skipped silently and dev/build still works but slower (no native file watcher, no native SWC).
- `BETTER_AUTH_SECRET` and `PG_NET_TOKEN` generated locally via `openssl rand -hex 32` (per F-02 plan + AGENTS.md "32-byte hex" convention). Both saved in `.env.local`. **Reminder to user**: back both up to password manager — same rotation discipline as `LIBSODIUM_MASTER_KEY` (lose them = invalidate sessions / break sync auth gate).
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set as empty strings in `.env.local`. Zod schema uses `.default('')` for both — F-02 boots without real Google credentials. S-01 will tighten these to `.min(1)` AND populate real values from Google Cloud Console.
- `src/env.ts` uses `safeParse` + early-throw pattern. Importing it anywhere in the app triggers validation once; thrown error message names every missing/invalid key before any HTTP request lands.

## Notes

- This task assumes F-01 (Supabase + libsodium key) is done — `.env.local` already has those values.
- `BETTER_AUTH_SECRET`: generate via `openssl rand -hex 32` if not yet in `.env.local`.
- `PG_NET_TOKEN`: same approach (`openssl rand -hex 32`). Used by T-009 sync stub auth check.
- `APP_URL` locally: `http://localhost:3000`. Production URL comes from F-03.
- `BETTER_AUTH_URL` locally: `http://localhost:3000`. Same as APP_URL.
- `GOOGLE_CLIENT_*` for **localhost** Google OAuth: requires a Google Cloud Console OAuth client with `http://localhost:3000/api/auth/callback/google` as authorized redirect URI. This is S-01 setup work, but for F-02 you can either: (a) skip setting up Google client until S-01 and relax Zod to `.optional()` here, accepting that F-02 verification step 5 (click "Zaloguj przez Google", see redirect to Google) won't work without it; OR (b) set up the Google client now to unblock F-02 verification. **Recommended**: (b) — adds ~10 min Google Cloud Console signup but unblocks immediate F-02 testing.
- **Why no Resend in v1**: per PRD FR-001 simplification, Google is the sole identity provider. No password-reset emails, no register-confirmation emails, no app-sent emails of any kind in v1. Resend may return in F-03 if backup-failure notifications or similar are needed — at that point it's a separate small addition.
