# 001 — Cloud Deploy Infrastructure (F-03)

Status: in-progress (9 active tasks pending, 3 obsolete tombstones)
Roadmap ref: **F-03** in [`docs/roadmap.md`](../../roadmap.md)
Audit trail: [`plan-v2.md`](./plan-v2.md) — verbatim M1L5 approved deployment plan (do NOT edit; this `plan.md` is the current execution summary)

> **Scope changes since original M1L5 plan-v2.md:**
> - **Local-first restructure** (commit `d7d2ac8`, 2026-05-26) — T-004 (Supabase) moved to F-01 `003-local-dev-unblockers/`. T-005 (Google OAuth) deferred to S-01 first slice.
> - **Google-only auth simplification** (commit `9c000b7`, 2026-05-27) — T-006 (Resend SPF/DKIM) obsoleted. Better Auth `emailAndPassword.enabled: false`. No app-sent emails in v1.

## Context

Trainer Advisor has a working local app skeleton coming from F-02 (`docs/work/002-app-skeleton/`) running on localhost against Supabase. **This initiative (F-03) is independent** — it does NOT unlock slice work. F-03 unlocks **production launch** (publishing the public URL, closing M1L5 cert milestone, posting on 10xDevs Arena).

The infrastructure preparation layer = external account registrations + the local config files already shipped in commit `2714979` (Dockerfile, docker-compose.yml, Caddyfile, scripts/server-setup.sh, scripts/backup-postgres.sh, .github/workflows/, etc.). After F-03 lands, one `git push` to `main` triggers GitHub Actions → builds Docker image → pushes to GHCR → SSH-deploys to Hetzner CX22 → Caddy serves HTTPS via Let's Encrypt.

Out of scope: any application code (slices S-01..S-04 do that). Resend or any other email-sender (Google-only auth = no app-sent emails). Sentry (deferred until first non-founder trainer).

## Stack reference (current, post-restructure)

| Layer | Choice | Cost |
|---|---|---|
| App host | Hetzner CX22 (Falkenstein) | €4.49/mo |
| Reverse proxy + TLS | Caddy (auto Let's Encrypt) | €0 |
| Container registry | GitHub Container Registry (GHCR) | €0 (private package) |
| CI/CD | GitHub Actions (2000 min/mo free) | €0 |
| Background jobs | Supabase `pg_cron` + `pg_net` → `/api/sync` (Supabase project from F-01) | €0 |
| Domain | TBD: OVH `.pl` (~12 PLN/y) or Cloudflare Registrar `.app` (~$15/y) | €3–13/y |
| Backup storage | Cloudflare R2 (10 GB free) | €0 |
| Uptime monitoring | UptimeRobot (free) | €0 |
| Error monitoring | Sentry (deferred until non-founder user) | €0 |
| **Total recurring** | | **< €5/mo + ~€10/y domain** |

(Out of this table vs original plan-v2.md: `Database` row dropped — Supabase belongs to F-01 not F-03. `OAuth provider` row dropped — Google Cloud Console belongs to S-01. `Email sender` row dropped — Resend obsolete.)

## Phase A — External cloud accounts (USER manual work)

7 services, mostly parallel:

| # | Service | Output to capture | T-NN |
|---|---|---|---|
| A1 | GitHub PAT with `write:packages` scope (or rely on built-in `GITHUB_TOKEN` — recommended) | optional `GHCR_TOKEN` | (no task — GitHub already exists) |
| A2 | Domain registrar (OVH or Cloudflare Registrar) | domain name, DNS provider | T-001 |
| A3 | Hetzner Cloud account, project `trainer-advisor`, SSH key uploaded, CX22 VM in Falkenstein with `scripts/server-setup.sh` as cloud-init user data | `HETZNER_HOST` (IPv4) | T-002 |
| A3.5 | DNS A/AAAA record `@ → HETZNER_HOST` at domain registrar | propagation 5–60 min | T-003 |
| A7 | Cloudflare R2 bucket `trainer-advisor-backups`, API token Read/Write scoped to bucket | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | T-007 |
| A8 | UptimeRobot HTTP(s) monitor on `https://<domain>/api/health` (post-deploy) | n/a | T-012 |
| A9 (optional) | Sentry EU project | `SENTRY_DSN` | (no task — deferred) |

All capturable outputs land in GitHub Secrets (T-009) for deploy + backup workflows. `SUPABASE_*_URL` values come from F-01's `.env.local` (same values, copied into GitHub Secrets at T-009). `GOOGLE_CLIENT_*` values come later from S-01 when the Google Cloud Console OAuth client is set up.

## Phase B — Local files (DONE in commit `2714979`)

These all exist in the repo already from M1L5 Phase B. No work needed beyond `T-010` (replace `your-domain.example` placeholders with the real domain after T-001):

| File | Purpose |
|---|---|
| `.env.example` | Canonical secret contract |
| `.dockerignore` | Trim Docker build context |
| `Dockerfile` | Multi-stage Next.js standalone production image |
| `docker-compose.yml` | Web + Caddy orchestration on Hetzner box |
| `Caddyfile` | Reverse proxy + automatic Let's Encrypt (domain placeholder needs T-010 swap) |
| `scripts/server-setup.sh` | Hetzner cloud-init bootstrap (Docker, UFW, fail2ban, deploy user) |
| `scripts/backup-postgres.sh` | Encrypted nightly pg_dump → R2 |
| `.github/workflows/deploy.yml` | CI: build → GHCR → SSH deploy |
| `.github/workflows/backup.yml` | Scheduled nightly backup |
| `.github/dependabot.yml` | Weekly auto-PRs for deps (excludes pinned Biome/Lefthook) |
| `next.config.ts` (edited) | `output: 'standalone'` enabled |
| `src/app/api/health/route.ts` | Health endpoint for UptimeRobot + post-deploy smoke |

## Execution runbook (9 active tasks)

Recommended order — minimum critical path with parallelization:

```
Parallel batch 1 (zero dependencies, ~10-15 min each, can run side-by-side):
  T-001 (register domain)        ~10 min browser
  T-002 (Hetzner CX22 VM)        ~15 min browser + cloud-init boot
  T-007 (R2 bucket + API token)  ~10 min browser

Sequenced after batch 1:
  T-003 (DNS A/AAAA records)         ~5 min + 5-60 min propagation  ← T-001 + T-002
  T-008 (SSH deploy key to Hetzner)  ~5 min                          ← T-002
  T-010 (replace domain placeholders + commit)  ~5 min                ← T-001

Final batch (depend on prior):
  T-009 (GitHub Actions secrets)  ~10 min   ← T-002, T-007, T-008
  T-011 (trigger first deploy + smoke)  ~15 min CI + verify  ← T-009, T-010
  T-012 (UptimeRobot + 10-step verification)  ~10 min   ← T-011
```

**Total active work**: ~85 min. **Wait time**: 30-60 min DNS propagation + ~5 min UptimeRobot first ping window.

## Decisions deferred to execution

1. **Domain name + registrar**: pick at T-001. Recommend `.app` via Cloudflare Registrar (at-cost pricing, requires Cloudflare DNS — free tier).
2. **GHCR visibility**: recommend **private** (image ~150 MB, fits free private package limit).
3. **R2 backup encryption passphrase** (`R2_ENC_PASS`): 32+ char random — `openssl rand -hex 32`, password manager + GitHub secret.
4. **Hetzner location**: **Falkenstein** (closer to Warsaw, same residency as Supabase Frankfurt = no cross-border traffic).
5. **Sentry**: defer until first non-founder user.

## Verification

After T-001..T-012 done, 8-point smoke test:

1. `pnpm build` succeeds locally with `output: 'standalone'`.
2. `docker build .` produces an image (optional local verify before push).
3. All 12 F-03 secrets present in GitHub Actions (per T-009 acceptance).
4. `ssh deploy@$HETZNER_HOST` works from local laptop.
5. Manual `workflow_dispatch` on `deploy.yml` → image lands in GHCR + SSH deploys to Hetzner.
6. `curl https://<domain>/api/health` returns 200.
7. UptimeRobot turns green within 5 min.
8. Trigger `backup.yml` manually → `.sql.gz.enc` appears in R2 bucket.

When all 8 pass: **F-03 done**, M1L5 closed, ready for 10xDevs Arena badge claim + public URL post.

## Reference

- Stack rationale: `docs/analyzes/language-and-infrastructure-stack-decision.md`
- Layout rationale: `docs/analyzes/project-structure-trainer-advisor-decision.md`
- Approved plan (verbatim, immutable audit trail): `plan-v2.md` in this folder
- Permission policy in effect: `.claude/settings.json` (ask on `docker *`, `ssh *`, `git push *`, `curl *`)
- Agent rules: `AGENTS.md`
- Roadmap: `docs/roadmap.md` (F-03 is this initiative)
