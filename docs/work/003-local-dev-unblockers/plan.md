# Plan — F-01 Local-dev unblockers

> **Roadmap ref:** F-01 in [`docs/roadmap.md`](../../roadmap.md). Unlocks F-02 (app skeleton). Does NOT unlock slice work — that's already F-02's job.

## Context

User preference: build app locally first, then cloud-deploy as a separate milestone. F-01 isolates the **minimum cloud accounts** F-02 actually needs to run on `localhost:3000` — namely a Postgres database with `pg_cron`/`pg_net` extensions and an encryption key.

Everything else from the original "infrastructure bootstrap" (Hetzner VM, domain, DNS, Caddy, GHCR, GitHub Actions deploy, Cloudflare R2 backups, UptimeRobot, Resend domain DKIM) is **F-03 cloud-deploy** and runs independently — see `docs/work/001-infra-bootstrap/`.

This initiative is intentionally small (1-2 tasks). Once done, `pnpm dev` boots against a real Supabase backend and `drizzle-kit migrate` applies schema. F-02 implementation can begin.

## Out of scope (delegated to F-03 / S-NN)

- Domain registration → F-03 (T-001 in `001-infra-bootstrap/`)
- Hetzner VM + Caddy + DNS → F-03
- Resend domain DKIM verification → F-03 (for production password-reset emails; local dev can mock via console logger)
- Cloudflare R2 backups → F-03
- GitHub Actions deploy + secrets → F-03
- UptimeRobot → F-03
- Google OAuth credentials → **deferred to S-01** (Google connect + first sync) — the OAuth flow lives entirely in S-01; F-02 verification doesn't need it (drop F-02 verification step 7 until S-01)

## Phase A — Supabase project

**A1.** Sign up at https://supabase.com/dashboard/sign-up (GitHub OAuth fastest).

**A2.** Create new project:
- Name: `trainer-advisor`
- Database password: random 32+ char string → store in password manager (NOT in `.env.example`)
- Region: **`Central EU (Frankfurt)`** (`eu-central-1`) — RODO requirement
- Pricing: Free

**A3.** Enable extensions: Database → Extensions → enable `pg_cron`, `pg_net`. These will power the 5-min sync schedule (configured later in F-03 manually). They must exist at Phase A time so `drizzle-kit migrate` in F-02 doesn't fail on extension lookups.

**A4.** Capture connection strings: Settings → Database → Connection string. Two URLs needed:
- **Pooled** (port 6543, transaction mode) → save as `SUPABASE_DATABASE_URL` in local `.env.local`. Used by app at runtime. **Must use `prepare: false`** in postgres-js (handled in F-02 `src/db/index.ts`).
- **Direct** (port 5432) → save as `SUPABASE_DIRECT_URL` in local `.env.local`. Used by `drizzle-kit migrate` only.

**A5.** Keepalive note: Free tier pauses after 7 days of inactivity. The `pg_cron` 5-min ping on `/api/sync` (set up in F-03, after first deploy) prevents this. Until then, if you don't touch the project for a week, you'll need to manually unpause it from the dashboard.

## Phase B — libsodium master key (local)

**B1.** Generate a 32-byte random key in hex:

```bash
openssl rand -hex 32
```

**B2.** Save as `LIBSODIUM_MASTER_KEY=<hex>` in local `.env.local`. **NEVER** commit this. Store the same value in your password manager so you can restore it if `.env.local` is lost — re-keying encrypted refresh tokens on key loss is painful and means re-authorizing Google for every connected trainer.

(No third-party account needed — pure local generation.)

## Verification

End-to-end checks F-01 is done:

1. **Supabase reachable:** `psql "$SUPABASE_DIRECT_URL" -c "SELECT version();"` returns a Postgres version line (no auth error, no connection timeout).
2. **Extensions enabled:** `psql "$SUPABASE_DIRECT_URL" -c "SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');"` returns both rows.
3. **Pooled connection works:** `psql "$SUPABASE_DATABASE_URL" -c "SELECT 1;"` returns `1` (proves Supavisor URL is valid — full `prepare: false` semantics are verified later in F-02).
4. **libsodium key present:** `grep -c LIBSODIUM_MASTER_KEY .env.local` returns `1` and the value matches `^[0-9a-f]{64}$` (64 hex chars = 32 bytes).
5. **`.env.local` not committed:** `git check-ignore .env.local` exits 0 (file is gitignored).

If all 5 pass: F-01 done. Flip status in `docs/roadmap.md` (`### F-01:` → `**Status:** done`). F-02 can begin.

## Out of scope for this plan

- All F-03 cloud-deploy work (covered in `docs/work/001-infra-bootstrap/`)
- Google OAuth (deferred to S-01)
- All F-02 application code (covered in `docs/work/002-app-skeleton/`)
- Production-grade key rotation policy for `LIBSODIUM_MASTER_KEY` (consider once first non-founder trainer onboards — until then, single key for life of v1 is acceptable)
