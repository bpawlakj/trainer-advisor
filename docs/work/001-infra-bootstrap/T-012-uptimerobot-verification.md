---
id: T-012
title: UptimeRobot monitor + 10-step verification + Arena post
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-011]
blocks: []
plan_anchor: A8-uptimerobot-verification
---

## Scope

Three things to close M1L5:

1. Activate UptimeRobot monitor on the live URL
2. Run the 10-step verification suite from `plan-v2.md § Verification`
3. Post the public URL to 10xDevs Arena (Circle) for badge claim

## Approach

### A. UptimeRobot

1. Sign up at https://uptimerobot.com (free tier, 50 monitors).
2. **+ New Monitor**:
   - Monitor type: `HTTP(s)`
   - Friendly name: `Trainer Advisor`
   - URL: `https://<domain>/api/health`
   - Monitoring interval: **5 minutes**
   - Alert contacts: default email (founder's address)
3. After 5 min the status should turn **Up** (green). UptimeRobot also
   exposes a public status page URL — share later if useful.

### B. 10-step verification (from plan-v2.md)

Run each, check off when green:

```
 1. Accounts: every secret in T-009 has a value in GitHub Secrets
 2. DNS: dig <domain> A, dig _resend._domainkey.<domain> TXT
 3. Hetzner box: ssh deploy@<host>, docker version, ufw status
 4. GHCR: image visible, both tags present
 5. App: curl https://<domain>/api/health → 200 + JSON
 6. TLS: curl -vI https://<domain> shows Let's Encrypt cert valid
 7. Supabase: psql "$SUPABASE_DIRECT_URL" -c "SELECT version();"
              + Extensions panel shows pg_cron + pg_net enabled
 8. Google OAuth smoke (LATER — needs Better Auth from M2; skip for now,
    record as "deferred to M2")
 9. UptimeRobot: monitor status = Up after 5 min
10. Backup: trigger .github/workflows/backup.yml manually, verify file
    lands in R2 bucket
```

### C. 10xDevs Arena post

1. https://bravecourses.circle.so → AI 10xDevs Arena channel.
2. Compose a short post:
   - Public URL of the deployed app
   - 2–3 lines about the stack (Next.js 16 + TS + Hetzner CX22 + Supabase Frankfurt)
   - Anything notable / surprising from the deploy
3. Post.
4. Claim the M1L5 badge in 10xDevs Mission Log.

## Acceptance

- [ ] UptimeRobot monitor created, status = Up
- [ ] 9 of 10 verification steps pass (step 8 OAuth deferred to M2)
- [ ] Backup workflow run completed, R2 bucket has 1+ `.sql.gz.enc` file
- [ ] Post on 10xDevs Arena with public URL
- [ ] M1L5 badge claimed

## Notes

This task closes the M1L5 lesson and Module 1 overall. After this, the next
work in `docs/work/` initiatives is M2-style (Better Auth wiring, Drizzle
schema, next-intl integration, business features).

Step 8 (Google OAuth smoke) genuinely depends on Better Auth being wired,
which is M2 work. Don't block M1L5 close on it — mark as "deferred to M2"
in the verification log.
