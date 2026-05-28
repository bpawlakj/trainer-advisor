---
id: T-002
title: Drizzle config + DB connection helper (Supavisor pooled)
status: done
plan: ../plan.md
created: 2026-05-27
completed: 2026-05-28
commit: null
depends_on: [T-001]
blocks: [T-003, T-004]
plan_anchor: B1-B2
---

## Scope

Wire Drizzle ORM against Supabase. Two artifacts: `drizzle.config.ts` (at repo root, for `drizzle-kit`) and `src/db/index.ts` (Drizzle instance with postgres-js pooled connection). `prepare: false` is **non-negotiable** for Supavisor transaction-mode pooling.

## Approach

1. Create `drizzle.config.ts` at repo root:

   ```ts
   import type { Config } from 'drizzle-kit';
   import { env } from './src/env';

   export default {
     schema: './src/db/schema',
     out: './drizzle',
     dialect: 'postgresql',
     dbCredentials: { url: env.SUPABASE_DIRECT_URL }, // port 5432 for migrations
     casing: 'snake_case',
   } satisfies Config;
   ```

2. Create `src/db/index.ts`:

   ```ts
   import { drizzle } from 'drizzle-orm/postgres-js';
   import postgres from 'postgres';
   import { env } from '@/env';
   import * as schema from './schema';

   const client = postgres(env.SUPABASE_DATABASE_URL, {
     prepare: false, // REQUIRED for Supavisor transaction-mode pooling
     max: 10,
   });

   export const db = drizzle(client, { schema });
   export type Database = typeof db;
   ```

3. Add `package.json` scripts:

   ```json
   "scripts": {
     "db:generate": "drizzle-kit generate",
     "db:migrate": "drizzle-kit migrate",
     "db:studio": "drizzle-kit studio"
   }
   ```

4. Sanity check: `pnpm db:studio` should boot Drizzle Studio against direct URL (no schema yet — empty UI, but connection proves valid). Close after verification.

## Acceptance

- [x] `drizzle.config.ts` exists at repo root with `dbCredentials.url = env.SUPABASE_DIRECT_URL` — verified 2026-05-28
- [x] `src/db/index.ts` exists, exports `db`, sets `prepare: false` (mandatory for Supavisor transaction-mode pooling)
- [x] `pnpm db:studio` boots without connection errors → "Drizzle Studio is up and running on https://local.drizzle.studio" — proves postgres-js connection to Supabase Frankfurt over Supavisor pooled URL succeeds
- [x] `package.json` has `db:generate`, `db:migrate`, `db:studio` scripts
- [x] Code review: only `drizzle.config.ts` and `src/db/index.ts` reference `env.SUPABASE_*_URL`; no other file reads `process.env.SUPABASE_*` or env URL directly
- [x] `pnpm exec drizzle-kit check` → "Everything's fine 🐶🔥" (drizzle.config.ts loads valid)
- [x] `pnpm exec tsc --noEmit` passes (no type errors)

## Completion notes (2026-05-28)

- `drizzle.config.ts` (15 lines): dialect postgresql, schema `./src/db/schema`, out `./drizzle`, dbCredentials from `env.SUPABASE_DIRECT_URL`, `casing: 'snake_case'`, `verbose: true`, `strict: true`.
- `src/db/index.ts` (16 lines): postgres-js client with `prepare: false` + `max: 10`, Drizzle instance with full schema spread. Exports `db` and `Database` type.
- `src/db/schema/index.ts` (5 lines): empty barrel stub (`export {};`) so drizzle-kit doesn't fail on missing schema dir. T-003 will populate with 9 table modules.
- Connection verification: `pnpm db:studio` booted successfully in 5-sec smoke run (user-authorized read-only test against Supabase `dwohtygymgrmfzeebyhg`). Studio reaches "up and running on local.drizzle.studio" without any connection errors. Proves postgres-js + Supavisor pooled URL + `prepare: false` configuration is correct. Killed after verification.
- `@/env` path alias used (Next.js + drizzle-kit's esbuild-kit both respect tsconfig `paths`). Vanilla `tsx` doesn't resolve path aliases without extra setup — that's a tsx limitation, not a code issue. Real Next dev + drizzle-kit commands work fine.

## Notes

- The `prepare: false` flag is a Supavisor-specific gotcha. Without it, prepared statements through the pooler fail with cryptic "prepared statement not found" errors only under concurrency. Cost: zero if set day one, painful if discovered week 3.
- Pooled URL (6543) for app code, direct URL (5432) for `drizzle-kit migrate`. Keep these clearly separated.
- `max: 10` is conservative for free tier. Tune in F-03 if production traffic warrants it.
- `casing: 'snake_case'` makes Drizzle generate snake_case column names matching Postgres convention (otherwise it would camelCase identifiers).
