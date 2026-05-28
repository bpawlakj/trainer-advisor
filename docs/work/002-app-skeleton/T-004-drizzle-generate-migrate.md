---
id: T-004
title: Generate + apply first Drizzle migration
status: done
plan: ../plan.md
created: 2026-05-27
completed: 2026-05-28
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

- [x] `drizzle/0000_tidy_luminals.sql` exists (117 lines), committed in this task
- [x] Manual inspection passed: 9 `CREATE TABLE`, 2 `CREATE TYPE` (enums), 9 FK constraints (all `ON DELETE CASCADE` or `SET NULL`), 1 `CREATE UNIQUE INDEX`. Zero `DROP` / `ALTER COLUMN` (clean first migration).
- [x] `pnpm db:migrate` exits 0 ("[✓] migrations applied successfully!")
- [x] `psql -c "\dt"` shows 9 tables in `public` schema: account, app_settings, attendance_records, calendar_events, clients, session, trainer_google_tokens, trainers, verification (`__drizzle_migrations` lives in `drizzle` schema, not `public` — fine, Drizzle convention)
- [x] `psql -c "\d clients"` confirms `trainer_id text not null` + FK `clients_trainer_id_trainers_id_fk → trainers(id) ON DELETE CASCADE`
- [x] `psql -c "\d trainer_google_tokens"` confirms `nonce bytea not null` + `ciphertext bytea not null`
- [x] `psql -c "\d calendar_events"` confirms `calendar_events_trainer_google_event_unique UNIQUE, btree (trainer_id, google_event_id)`
- [x] `SELECT typname FROM pg_type WHERE typtype = 'e'` includes `calendar_event_status` + `client_status` (alongside ~13 Supabase auth/storage enums — those are Supabase internals, not ours)

## Completion notes (2026-05-28)

- Migration file: `drizzle/0000_tidy_luminals.sql` (drizzle-kit's auto-generated tag — Drizzle uses random adjective + noun naming).
- `drizzle/meta/_journal.json` updated automatically to record migration #0 application (`{"idx": 0, "version": "7", "when": 1779998928672, "tag": "0000_tidy_luminals", "breakpoints": true}`).
- Migration applied via direct connection (`SUPABASE_DIRECT_URL`, port 5432) — Drizzle uses this for migrations only. App runtime uses pooled URL (port 6543, `prepare: false`) per T-002.
- User-side verification ran 5 psql queries in their terminal — all 5 pass. Output pasted in task acceptance.
- F-02 T-006 (Better Auth config) is now unblocked. T-010 (smoke test) and S-NN slice work all gain a real DB to write against.

## Notes

- **NEVER use `drizzle-kit push` in production.** It silently drops data on schema changes. Per AGENTS.md critical rule.
- The first migration is the easy one — there's no existing data. The discipline matters from migration 2 onward.
- If migration fails: don't apply partial fixes manually via psql. Roll back (`DROP` tables, delete `drizzle/0000_*.sql`), fix the schema TS file, regenerate. Migrations should always come from `db:generate`.
- The migration file name has a random suffix (e.g. `0000_purple_storm.sql`) — that's Drizzle's naming convention. Commit it as-is.
