---
id: T-001
title: Create Supabase project + enable extensions + capture connection strings
status: done
plan: ../plan.md
created: 2026-05-27
completed: 2026-05-27
commit: null
depends_on: []
blocks: [F-02]
plan_anchor: Phase-A
---

## Scope

Stand up the Supabase project that will back local development. Output: two valid Postgres connection strings (pooled + direct) in `.env.local`, with `pg_cron` and `pg_net` extensions enabled.

## Approach

1. Sign up at https://supabase.com/dashboard/sign-up (GitHub OAuth fastest).
2. **New Project**:
   - Name: `trainer-advisor`
   - Database password: random 32+ char → password manager (NOT `.env.example`)
   - Region: **`Central EU (Frankfurt)`** (`eu-central-1`) — RODO requirement
   - Pricing: Free
3. **Enable extensions**: Database → Extensions → enable `pg_cron`, `pg_net`. Both must exist before F-02 `drizzle-kit migrate` runs.
4. **Capture connection strings**: Settings → Database → Connection string.
   - **Pooled** (port 6543, transaction mode, includes `?pgbouncer=true`) → `SUPABASE_DATABASE_URL` in `.env.local`
   - **Direct** (port 5432) → `SUPABASE_DIRECT_URL` in `.env.local`
5. **Keepalive note** (informational, no action): Free tier pauses after 7 days idle. The `/api/sync` pg_cron job set up in F-03 will keep it alive; until then manual unpause may be needed if you idle for a week.

## Acceptance

- [x] Supabase project visible in dashboard with region `Central EU (Frankfurt)` — project ref `dwohtygymgrmfzeebyhg`
- [x] `psql "$SUPABASE_DIRECT_URL" -c "SELECT version();"` returns a Postgres version line — verified 2026-05-27 in user's terminal (3/3 pass reported)
- [x] `psql "$SUPABASE_DIRECT_URL" -c "SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');"` returns both rows
- [x] `psql "$SUPABASE_DATABASE_URL" -c "SELECT 1;"` returns `1` (pooled URL valid via transaction-mode pooler at `aws-1-eu-central-1.pooler.supabase.com:6543`)
- [x] `.env.local` has `SUPABASE_DATABASE_URL=postgresql://postgres.dwohtygymgrmfzeebyhg:...@aws-1-eu-central-1.pooler.supabase.com:6543/postgres` (note: newer Supabase pooler omits `?pgbouncer=true` — handled server-side; postgres-js still needs `prepare: false` in F-02)
- [x] `.env.local` has `SUPABASE_DIRECT_URL=postgresql://postgres:...@db.dwohtygymgrmfzeebyhg.supabase.co:5432/postgres`
- [x] DB password stored in password manager separately
- [x] `git check-ignore .env.local` exits 0

## Completion notes (2026-05-27)

- psql installed locally via `brew install postgresql@17` (Homebrew formula, ~76 MB). Lives at `/opt/homebrew/opt/postgresql@17/bin/psql`. Standard install (not keg-only linking) — full path used in verification.
- All 3 verification queries passed in user's terminal. No 4th `?pgbouncer=true` param in pooled URL is the new Supavisor v2 convention — works the same.
- F-02 unblocked partially (still needs T-002 libsodium key in `.env.local`).

## Notes

- Browser-based work — agent cannot execute steps 1-4 directly.
- If `psql` not installed locally: `brew install postgresql` (Mac) or use Supabase's "Connect → psql snippet" copy-paste with their CLI.
- Open Question (defer to S-01): the `pg_cron` job SQL itself lands in F-02 T-009 as a manual migration file but only gets executed against Supabase after F-03 first deploy (URL must exist).
