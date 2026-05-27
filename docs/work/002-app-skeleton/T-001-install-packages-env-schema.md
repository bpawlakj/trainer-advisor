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

1. Install runtime packages:

   ```bash
   pnpm add better-auth drizzle-orm postgres libsodium-wrappers next-intl zod resend
   ```

2. Install dev packages:

   ```bash
   pnpm add -D drizzle-kit @types/libsodium-wrappers
   ```

3. Create `src/env.ts`:

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
     RESEND_API_KEY: z.string().min(1),
     RESEND_FROM: z.string().email(),
     PG_NET_TOKEN: z.string().min(32),
   });

   export const env = envSchema.parse(process.env);
   ```

4. Update `.env.example` (sync from F-01-era + add F-02 vars):
   - `PG_NET_TOKEN` (generate via `openssl rand -hex 32` placeholder)
   - Verify all 11 keys above are listed

5. **All other modules MUST import `env` from `src/env.ts`** — never `process.env` directly. Add a Biome rule or convention note if needed.

## Acceptance

- [ ] `pnpm ls better-auth drizzle-orm postgres next-intl libsodium-wrappers zod resend` returns all with versions (no `(missing)`)
- [ ] `pnpm ls drizzle-kit @types/libsodium-wrappers --depth=0` shows both as devDependencies
- [ ] `src/env.ts` exists and exports `env` typed via Zod
- [ ] Running `pnpm dev` with a missing env key (e.g. delete `BETTER_AUTH_SECRET` from `.env.local`) crashes with Zod's named error message before serving any request
- [ ] `.env.example` lists all 11 F-02 vars
- [ ] `.env.example` is committed; `.env.local` is gitignored (already done in M1L5)

## Notes

- This task assumes F-01 (Supabase + libsodium key) is done — `.env.local` already has those values.
- `BETTER_AUTH_SECRET`: generate via `openssl rand -hex 32` if not yet in `.env.local`.
- `PG_NET_TOKEN`: same approach (`openssl rand -hex 32`). Used by T-009 sync stub auth check.
- `APP_URL` locally: `http://localhost:3000`. Production URL comes from F-03.
- `BETTER_AUTH_URL` locally: `http://localhost:3000`. Same as APP_URL.
- `GOOGLE_CLIENT_*` may be empty placeholders for now (real values come in S-01 setup; for F-02 verification of "Google provider scaffolded", Zod could relax these to `.optional()` if blocking — but cleaner to fill with empty strings for now and tighten in S-01).
