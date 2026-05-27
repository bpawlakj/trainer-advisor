---
id: T-001
title: Install packages + Zod env schema
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
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

- [ ] `pnpm ls better-auth drizzle-orm postgres next-intl libsodium-wrappers zod` returns all with versions (no `(missing)`)
- [ ] `pnpm ls resend` returns "no such package" or `(not installed)` (NOT installed — Google handles identity)
- [ ] `pnpm ls drizzle-kit @types/libsodium-wrappers --depth=0` shows both as devDependencies
- [ ] `src/env.ts` exists and exports `env` typed via Zod
- [ ] Running `pnpm dev` with a missing env key (e.g. delete `BETTER_AUTH_SECRET` from `.env.local`) crashes with Zod's named error message before serving any request
- [ ] `.env.example` lists the 9 required F-02 vars (no `RESEND_*` keys)
- [ ] `.env.example` is committed; `.env.local` is gitignored (already done in M1L5)

## Notes

- This task assumes F-01 (Supabase + libsodium key) is done — `.env.local` already has those values.
- `BETTER_AUTH_SECRET`: generate via `openssl rand -hex 32` if not yet in `.env.local`.
- `PG_NET_TOKEN`: same approach (`openssl rand -hex 32`). Used by T-009 sync stub auth check.
- `APP_URL` locally: `http://localhost:3000`. Production URL comes from F-03.
- `BETTER_AUTH_URL` locally: `http://localhost:3000`. Same as APP_URL.
- `GOOGLE_CLIENT_*` for **localhost** Google OAuth: requires a Google Cloud Console OAuth client with `http://localhost:3000/api/auth/callback/google` as authorized redirect URI. This is S-01 setup work, but for F-02 you can either: (a) skip setting up Google client until S-01 and relax Zod to `.optional()` here, accepting that F-02 verification step 5 (click "Zaloguj przez Google", see redirect to Google) won't work without it; OR (b) set up the Google client now to unblock F-02 verification. **Recommended**: (b) — adds ~10 min Google Cloud Console signup but unblocks immediate F-02 testing.
- **Why no Resend in v1**: per PRD FR-001 simplification, Google is the sole identity provider. No password-reset emails, no register-confirmation emails, no app-sent emails of any kind in v1. Resend may return in F-03 if backup-failure notifications or similar are needed — at that point it's a separate small addition.
