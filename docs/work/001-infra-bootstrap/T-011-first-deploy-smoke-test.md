---
id: T-011
title: Trigger first deploy + verify GHCR image + smoke test
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-009, T-010]
blocks: [T-012]
plan_anchor: verification
---

## Scope

End-to-end deploy: GitHub Actions builds the Docker image, pushes to GHCR,
scp's compose + Caddyfile to the box, renders `.env` from secrets, runs
`docker compose pull && up -d`, then smokes `https://<domain>/api/health`.

This is the moment Trainer Advisor becomes publicly accessible.

## Approach

1. Open GitHub → repo → **Actions → deploy** (or whichever workflow file
   shows in the sidebar).
2. Click **Run workflow** → branch: `main` → **Run workflow**.
3. Watch the job stream. Expect ~3–5 min total:
   - `build` job: pnpm install + Next.js build + docker buildx + GHCR push (~3 min)
   - `deploy` job: scp + ssh + docker compose pull/up + smoke (~30s + healthcheck wait)
4. While running, verify the image lands in GHCR:
   - https://github.com/bpawlakj/trainer-advisor/pkgs/container/trainer-advisor
   - Should show tag `latest` + a short-SHA tag (e.g. `sha-abc1234`)
5. The smoke step at end of `deploy` job curls `${APP_URL}/api/health` and
   loops 12 × 5s waiting for `200 OK`. If green → deploy succeeded.
6. Manual confirmation from laptop:
   ```bash
   curl -sS https://<domain>/api/health | jq .
   # Expected: { "status": "ok", "service": "trainer-advisor", "commit": null|<sha>, "timestamp": "..." }
   ```
7. Open `https://<domain>` in a browser → Next.js default landing page should
   render (the scaffold from commit `b14e85e`).

## Acceptance

- [ ] GitHub Actions `deploy` workflow run shows green for both jobs
- [ ] GHCR image visible with at least 2 tags (`latest` + sha)
- [ ] `curl https://<domain>/api/health` returns 200 + JSON envelope
- [ ] Browser hit on `https://<domain>` shows Next.js page
- [ ] TLS cert is Let's Encrypt issued, valid (verify via `curl -vI`)
- [ ] No errors in workflow logs (warnings are OK if they're known)

## Notes

Common first-deploy failures:
- **Caddy can't fetch cert**: usually DNS hasn't propagated yet (T-003) or
  port 80 is blocked. Verify with `dig <domain>` + `ssh deploy@<host> 'sudo ufw status'`.
- **Image pull fails on the box**: GHCR auth in the deploy workflow uses
  `GITHUB_TOKEN` — if it fails, the box may need a manual `docker login ghcr.io`
  with the user's PAT. Re-check `secrets.GITHUB_TOKEN` is in scope for the job.
- **Smoke test 404**: app booted but `/api/health` route missing — verify
  `src/app/api/health/route.ts` exists in the deployed image (`docker exec` and `find`).
