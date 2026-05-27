---
id: T-009
title: Sync stub /api/sync + pg_cron SQL (manual migration)
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
commit: null
depends_on: [T-001]
blocks: [T-010]
plan_anchor: E1-E2
---

## Scope

Create the `/api/sync` POST endpoint as a **no-op stub** (real implementation lands in S-02) — but with the auth gate (`Authorization: Bearer <PG_NET_TOKEN>`) wired correctly so production pg_cron + pg_net invocations are accepted and random internet traffic is rejected. Plus the SQL snippet for the pg_cron job to schedule that endpoint every 5 minutes, parked under `drizzle/manual/` (NOT auto-applied by `drizzle-kit migrate`).

## Approach

### 1. `src/app/api/sync/route.ts`

```ts
import { env } from '@/env';

export async function POST(req: Request) {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${env.PG_NET_TOKEN}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Real sync logic lands in S-02 (calendar event pull from Google).
  console.log(`[sync] invoked at ${new Date().toISOString()}`);

  return Response.json({
    status: 'ok',
    synced: 0,
    timestamp: new Date().toISOString(),
  });
}
```

### 2. `drizzle/manual/0001_pg_cron_sync.sql`

```sql
-- Schedule /api/sync via pg_cron + pg_net.
-- APPLY MANUALLY against Supabase SQL editor AFTER F-03 first deploy.
-- This file is NOT picked up by `drizzle-kit migrate` (lives under manual/).
--
-- Replace placeholders before applying:
--   <domain>        → your production domain (from F-03 T-001)
--   <PG_NET_TOKEN>  → the env value matching env.PG_NET_TOKEN

SELECT cron.schedule(
  'trainer-advisor-sync',
  '*/5 * * * *',
  $$ SELECT net.http_post(
       url := 'https://<domain>/api/sync',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer <PG_NET_TOKEN>'
       )
     ) $$
);

-- To verify the job exists:
--   SELECT * FROM cron.job WHERE jobname = 'trainer-advisor-sync';
-- To inspect recent invocations:
--   SELECT * FROM cron.job_run_details
--     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'trainer-advisor-sync')
--     ORDER BY start_time DESC LIMIT 10;
-- To remove the job:
--   SELECT cron.unschedule('trainer-advisor-sync');
```

## Acceptance

- [ ] `src/app/api/sync/route.ts` exists, exports POST, checks `Bearer ${env.PG_NET_TOKEN}`
- [ ] `curl -X POST -H "Authorization: Bearer $PG_NET_TOKEN" http://localhost:3000/api/sync` → 200 OK with `{status:'ok',synced:0,timestamp:'...'}`
- [ ] `curl -X POST http://localhost:3000/api/sync` (no auth) → 401 `{error:'unauthorized'}`
- [ ] `curl -X POST -H "Authorization: Bearer wrong" http://localhost:3000/api/sync` → 401
- [ ] `drizzle/manual/0001_pg_cron_sync.sql` exists, committed
- [ ] Comment in SQL file clearly states this is manual-apply, not auto
- [ ] `pnpm db:migrate` does NOT try to apply the file under `manual/` (sanity check by inspecting drizzle's behavior — `manual/` is outside the standard migrations folder it scans)

## Notes

- **No real sync logic in F-02.** This endpoint is a placeholder so pg_cron has something to call without 404s. S-02 fills in the actual Google Calendar pull.
- The auth gate must work day one — once pg_cron is scheduled (F-03), it'll start hammering /api/sync every 5 min and we don't want the endpoint open to the internet.
- `PG_NET_TOKEN` is in `.env.local` per T-001 (`openssl rand -hex 32`). Same value must be plugged into the SQL placeholder when the manual migration is applied.
- The `drizzle/manual/` folder is a convention this project introduces — `drizzle-kit migrate` scans `drizzle/` for `.sql` files but ignores subfolders (verify with Drizzle docs / experiment). Naming the file `0001_pg_cron_sync.sql` matches Drizzle's pattern; the path nesting under `manual/` is what keeps it isolated.
- Alternative: put pg_cron SQL in a separate doc (not under `drizzle/`) to avoid any confusion. Decision: keep under `drizzle/manual/` because the file IS a SQL migration semantically — just one we apply manually for now (until we have a story for "infra migrations that aren't schema migrations").
- This endpoint should NOT call any DB code in F-02. Adding DB calls = scope creep into S-02.
