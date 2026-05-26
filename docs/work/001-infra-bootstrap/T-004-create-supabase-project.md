---
id: T-004
title: Create Supabase project + enable extensions
status: obsolete
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: []
blocks: [T-009]
plan_anchor: A4-supabase
---

## Obsoleted on 2026-05-26

Moved to F-01 local-dev unblockers — see [`docs/work/003-local-dev-unblockers/plan.md`](../003-local-dev-unblockers/plan.md) Phase A. Roadmap restructured to surface "local first, cloud second" execution model. This task's scope (Supabase project + `pg_cron`/`pg_net` extensions + connection strings) is now F-01 work, not F-03 cloud-deploy work.

## Scope

Stand up the managed Postgres that the app + `pg_cron` will use. Free tier,
Frankfurt region (RODO + same residency as the Hetzner box).

Outputs:
- `SUPABASE_DATABASE_URL` — pooled connection, port 6543, app code uses this
- `SUPABASE_DIRECT_URL` — direct connection, port 5432, only for `drizzle-kit migrate`
- DB password (in password manager, NEVER in repo)
- `pg_cron` + `pg_net` extensions enabled

## Approach

1. Sign up at https://supabase.com/dashboard/sign-up (GitHub OAuth is fastest).
2. Create new project:
   - Name: `trainer-advisor`
   - Database password: generate 32+ chars via password manager; save it there
   - Region: **Central EU (Frankfurt)** — `eu-central-1`
   - Plan: **Free**
3. Wait ~2 min for provisioning.
4. Project Settings → Database → **Connection string**:
   - **Pooled** (port 6543, transaction mode) → copy as `SUPABASE_DATABASE_URL`
   - **Direct** (port 5432) → copy as `SUPABASE_DIRECT_URL`
   - Both contain the password from step 2 (URL-encoded).
5. Database → **Extensions**:
   - Enable `pg_cron`
   - Enable `pg_net`
   - (Both are required for the 5-min sync job that calls `/api/sync` after M2.)

## Acceptance

- [ ] Supabase project in `Active` state, Frankfurt region
- [ ] Pooled connection string saved (`SUPABASE_DATABASE_URL`)
- [ ] Direct connection string saved (`SUPABASE_DIRECT_URL`)
- [ ] `pg_cron` extension shows enabled in Extensions UI
- [ ] `pg_net` extension shows enabled in Extensions UI
- [ ] `psql "$SUPABASE_DIRECT_URL" -c "SELECT version();"` returns from local laptop

## Notes

Free tier pauses the project after 7 days of inactivity. After deploy, the
5-min `pg_cron → /api/sync` job (M2 work) keeps the project warm. Until then,
manually click around the Studio occasionally to prevent the pause.
