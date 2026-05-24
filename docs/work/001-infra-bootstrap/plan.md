# 001 — Infrastructure Bootstrap (M1L5 prep)

Status: in-progress
Started: 2026-05-24
Owner: founder
Anchor: `docs/analyzes/language-and-infrastructure-stack-decision.md`

## Context

Trainer Advisor has a runnable Next.js shell (commit `b14e85e`, M1L3 Phase 1) + agent rules (`AGENTS.md`, commit `8e753a0`, M1L4). The stack decision is locked: Hetzner CX22 + Supabase Frankfurt + GitHub Actions → GHCR → SSH deploy + libsodium token encryption.

This initiative produces the **infrastructure preparation layer**: external account registrations + local config files. After it lands, one `git push` on `main` triggers a deploy and the public URL goes live — closing M1L5.

Out of scope: Better Auth wiring, Drizzle schema, next-intl integration, business logic. Those are M2 work.

## Stack reference

| Layer | Choice | Cost |
|---|---|---|
| App host | Hetzner CX22 (Falkenstein) | €4.49/mo |
| Reverse proxy + TLS | Caddy (auto Let's Encrypt) | €0 |
| Database | Supabase Postgres Frankfurt (free) | €0 |
| Container registry | GitHub Container Registry (GHCR) | €0 |
| CI/CD | GitHub Actions (2000 min/mo free) | €0 |
| OAuth provider | Google Cloud Console (Calendar API) | €0 |
| Background jobs | Supabase `pg_cron` + `pg_net` → `/api/sync` | €0 |
| Domain | TBD: OVH `.pl` (~12 PLN/y) or Cloudflare Registrar `.app` (~$15/y) | €3–13/y |
| Email sender | Resend (recommended) | €0 free 100/d |
| Backup storage | Cloudflare R2 (10 GB free) | €0 |
| Uptime monitoring | UptimeRobot (free) | €0 |
| Error monitoring | Sentry (deferred until non-founder user) | €0 |
| **Total recurring** | | **< €5/mo + ~€10/y domain** |

## Phase A — External accounts (USER manual work)

Sequential, each later step may need output of earlier.

| # | Service | Output to capture |
|---|---|---|
| A1 | GitHub PAT with `write:packages` scope (or rely on `GITHUB_TOKEN` in Actions) | `GHCR_TOKEN` (optional) |
| A2 | Domain registrar (OVH or Cloudflare Registrar) | domain name, DNS provider |
| A3 | Hetzner Cloud account, project `trainer-advisor`, SSH key uploaded, CX22 VM in Falkenstein with `scripts/server-setup.sh` as cloud-init user data | `HETZNER_HOST` (IPv4) |
| A3.5 | DNS A record `@ → HETZNER_HOST` at domain registrar | propagation 5–60 min |
| A4 | Supabase project, region Frankfurt, free tier, extensions `pg_cron` + `pg_net` enabled | `SUPABASE_DATABASE_URL` (pooled, port 6543) + `SUPABASE_DIRECT_URL` (direct, port 5432) |
| A5 | Google Cloud Console project, Calendar API enabled, OAuth consent screen External in Testing, redirect URI `https://<domain>/api/auth/callback/google`, scope `calendar.events.readonly` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| A6 | Resend account, domain verification via SPF+DKIM, API key | `RESEND_API_KEY`, `RESEND_FROM` |
| A7 | Cloudflare R2 bucket `trainer-advisor-backups`, API token Read/Write scoped to bucket | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` |
| A8 | UptimeRobot HTTP(s) monitor on `https://<domain>/api/health` | n/a |
| A9 (optional) | Sentry EU project | `SENTRY_DSN` |

All outputs land in GitHub Secrets (Repo Settings → Secrets and variables → Actions).

## Phase B — Local files (THIS COMMIT)

| File | Purpose |
|---|---|
| `.env.example` | Canonical secret contract |
| `.dockerignore` | Trim Docker build context |
| `Dockerfile` | Multi-stage Next.js standalone production image |
| `docker-compose.yml` | Web + Caddy orchestration on Hetzner box |
| `Caddyfile` | Reverse proxy + automatic Let's Encrypt |
| `scripts/server-setup.sh` | Hetzner cloud-init bootstrap (Docker, UFW, fail2ban, deploy user) |
| `scripts/backup-postgres.sh` | Encrypted nightly pg_dump → R2 |
| `.github/workflows/deploy.yml` | CI: build → GHCR → SSH deploy |
| `.github/workflows/backup.yml` | Scheduled nightly backup |
| `.github/dependabot.yml` | Weekly auto-PRs for deps (excludes pinned Biome/Lefthook) |
| `next.config.ts` (edit) | Enable `output: 'standalone'` for Dockerfile |
| `src/app/api/health/route.ts` | Health endpoint for UptimeRobot + post-deploy smoke |
| `.gitignore` (edit) | Add `.env.local`, `.env.production`, `caddy_*` volume dirs |

## Decisions deferred to execution

1. **Domain name + registrar**: pick after this commit. Recommend `.app` via Cloudflare Registrar.
2. **GHCR visibility**: recommend **private** (image is ~150 MB, fits free private package limit).
3. **R2 backup encryption passphrase**: 32+ char random, password manager + GitHub secret `R2_ENC_PASS`.
4. **Hetzner location**: Falkenstein (closer to Warsaw, same residency as Supabase Frankfurt).
5. **Sentry**: defer until first non-founder user.

## Verification

After Phase A + this commit:

1. `pnpm build` succeeds locally with `output: 'standalone'`.
2. `docker build .` produces an image (verify locally before push, optional).
3. All Phase A secrets present in GitHub Actions.
4. `ssh deploy@$HETZNER_HOST` works from local laptop.
5. Manual workflow_dispatch on `deploy.yml` → image lands in GHCR + SSH deploys.
6. `curl https://<domain>/api/health` returns 200.
7. UptimeRobot turns green within 5 min.
8. Trigger `backup.yml` manually → `.sql.gz.enc` appears in R2 bucket.

When all 8 pass: **M1L5 closed**, ready for badge claim + post on 10xDevs Arena.

## Reference

- Stack rationale: `docs/analyzes/language-and-infrastructure-stack-decision.md`
- Layout rationale: `docs/analyzes/project-structure-trainer-advisor-decision.md`
- Approved plan (verbatim): `~/.claude/plans/piped-floating-wand.md` (off-repo; this file is the in-repo summary)
- Permission policy in effect: `.claude/settings.json` (ask on `docker *`, `ssh *`, `git push *`)
- Agent rules: `AGENTS.md`
