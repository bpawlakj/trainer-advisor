---
id: T-004
title: Generate + apply first Drizzle migration
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
commit: null
depends_on: [T-003]
blocks: [T-006, T-010]
plan_anchor: B4
---

## Scope

Run `drizzle-kit generate` to materialize the schema as SQL, inspect the generated migration for correctness (especially `trainer_id NOT NULL` everywhere), commit it, then apply against Supabase via `drizzle-kit migrate`.

## Approach

1. Generate migration:

   ```bash
   pnpm db:generate
   ```

   Output: `drizzle/0000_<random-suffix>.sql` plus `drizzle/meta/_journal.json`.

2. **Inspect the generated SQL manually**. Verify:
   - Every business table CREATE has `trainer_id ... NOT NULL`
   - `calendar_events` has `CONSTRAINT ... UNIQUE (trainer_id, google_event_id)`
   - `attendance_records.calendar_event_id` is `UNIQUE NOT NULL`
   - `trainer_google_tokens` has `nonce bytea NOT NULL` and `ciphertext bytea NOT NULL`
   - `clients.email` is `NOT NULL`
   - Foreign keys all point at correct parent tables
   - No `DROP` statements (first migration should only `CREATE`)

3. Commit the migration as-is (NEVER hand-edit a generated migration — that's what `db:generate` is for; if it's wrong, fix `src/db/schema/*` and regenerate).

4. Apply against Supabase:

   ```bash
   pnpm db:migrate
   ```

   This uses `SUPABASE_DIRECT_URL` (port 5432) per `drizzle.config.ts`. Should be fast (single-digit seconds) for the initial migration.

5. **Verify in Supabase**:

   ```bash
   psql "$SUPABASE_DIRECT_URL" -c "\dt"
   ```

   Should list 9 tables: `trainers`, `trainer_google_tokens`, `clients`, `calendar_events`, `attendance_records`, `app_settings`, `session`, `account`, `verification`. Plus `__drizzle_migrations` (Drizzle's bookkeeping table — fine to ignore).

   ```bash
   psql "$SUPABASE_DIRECT_URL" -c "\d clients" | grep "trainer_id"
   ```

   Expected output line includes `not null`.

## Acceptance

- [ ] `drizzle/0000_*.sql` exists, committed
- [ ] Manual inspection passed (NOT NULL constraints, UNIQUEs, FKs all present)
- [ ] `pnpm db:migrate` exits 0
- [ ] `psql ... -c "\dt"` shows all 9 business + Better Auth tables
- [ ] `psql ... -c "\d clients"` shows `trainer_id ... not null`
- [ ] `psql ... -c "\d trainer_google_tokens"` shows `nonce bytea not null` + `ciphertext bytea not null`
- [ ] `psql ... -c "\d calendar_events"` shows `UNIQUE (trainer_id, google_event_id)` constraint
- [ ] `__drizzle_migrations` table has one row (proof Drizzle records the migration)

## Notes

- **NEVER use `drizzle-kit push` in production.** It silently drops data on schema changes. Per AGENTS.md critical rule.
- The first migration is the easy one — there's no existing data. The discipline matters from migration 2 onward.
- If migration fails: don't apply partial fixes manually via psql. Roll back (`DROP` tables, delete `drizzle/0000_*.sql`), fix the schema TS file, regenerate. Migrations should always come from `db:generate`.
- The migration file name has a random suffix (e.g. `0000_purple_storm.sql`) — that's Drizzle's naming convention. Commit it as-is.
