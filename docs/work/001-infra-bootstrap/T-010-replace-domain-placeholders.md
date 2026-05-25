---
id: T-010
title: Replace domain placeholders in repo
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-001]
blocks: [T-011]
plan_anchor: B5-caddyfile
---

## Scope

Two repo files contain literal `your-domain.example` placeholders that need
the real domain before Caddy can fetch a TLS cert. Replace + commit + push.

## Approach

1. Edit `Caddyfile`:
   ```diff
   - your-domain.example {
   + traineradvisor.pl {        # or trener.app, whichever from T-001
   ```
   (Leave header policy, `encode`, `reverse_proxy web:3000` unchanged.)

2. Edit `.env.example`:
   ```diff
   - APP_URL=https://your-domain.example
   + APP_URL=https://traineradvisor.pl
   - RESEND_FROM=trener@your-domain.example
   + RESEND_FROM=trener@traineradvisor.pl
   ```
   `.env.example` is documentation — real values still come from secrets.

3. (Optional) Grep for any remaining placeholders:
   ```bash
   grep -rn "your-domain.example" --exclude-dir={node_modules,.next,.git}
   ```

4. Commit:
   ```bash
   git add Caddyfile .env.example
   git commit -m "chore(infra): pin Caddyfile + .env.example to real domain"
   ```

5. Push (will NOT trigger workflow auto-deploy yet — deploy.yml runs on push
   to main, BUT will fail until T-009 secrets exist. That's fine; manual
   trigger in T-011).

## Acceptance

- [ ] `Caddyfile` first line matches real domain (no `.example` left)
- [ ] `.env.example` reflects real domain (still has placeholders for actual
      secret values; this is only for the domain string itself)
- [ ] `grep -rn "your-domain.example"` returns no production-path matches
- [ ] Commit pushed to origin/main

## Notes

The .env.example file is committed to repo as the secret-schema reference —
its values are placeholders, real ones live in GitHub Actions secrets (T-009)
and on the box's `/home/deploy/app/.env` (written by the deploy workflow).
