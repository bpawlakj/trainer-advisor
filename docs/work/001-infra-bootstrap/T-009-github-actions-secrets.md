---
id: T-009
title: Configure GitHub Actions secrets
status: pending
plan: ../plan.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-002, T-007, T-008]
blocks: [T-011]
plan_anchor: A1-github-secrets
---

## Scope

Populate the secrets the deploy + backup workflows expect (per `.env.example` + workflow YAMLs). Some are generated locally; the rest come from prior F-03 Phase A tasks. **Some env values come from outside F-03**:
- `SUPABASE_*_URL` captured in **F-01** (`003-local-dev-unblockers/T-001`) — same values used for deploy runtime; just copy them into GitHub Secrets here.
- `GOOGLE_CLIENT_*` captured in **S-01** when Google Cloud Console is set up — **not added in F-03**; they'll be added later when S-01 lands.
- `RESEND_*` not needed (Google-only auth = no app-sent emails in v1 per PRD FR-001).

## Approach

### Generate locally first (one-off, copy to clipboard each time)

```bash
# Each command: 32-byte random hex, suitable as HMAC/encryption key.
openssl rand -hex 32   # → BETTER_AUTH_SECRET
openssl rand -hex 32   # → LIBSODIUM_MASTER_KEY
openssl rand -hex 32   # → R2_ENC_PASS   (32 chars is fine — openssl pads internally)
```

Save all three in password manager BEFORE pasting to GitHub (so they survive
a rotate-and-re-deploy later).

### Add to GitHub

Repo Settings → **Secrets and variables → Actions → New repository secret**.
12 entries to configure in F-03 (was 17 before restructure):

| Secret name | Source | Notes |
|---|---|---|
| `HETZNER_HOST` | T-002 | IPv4 only, no port |
| `HETZNER_SSH_KEY` | T-008 | Full private key file content incl. `-----BEGIN...END-----` lines |
| `SUPABASE_DATABASE_URL` | F-01 (`003-local-dev-unblockers/T-001`) | Pooled, port 6543, includes `?pgbouncer=true`. Copy same value from `.env.local`. |
| `SUPABASE_DIRECT_URL` | F-01 (`003-local-dev-unblockers/T-001`) | Direct, port 5432. Copy from `.env.local`. |
| `BETTER_AUTH_SECRET` | local | 64 hex chars from `openssl rand -hex 32` |
| `LIBSODIUM_MASTER_KEY` | F-01 (`003-local-dev-unblockers/T-002`) | 64 hex chars. **Same value as `.env.local`** — losing key sync would orphan encrypted refresh tokens. |
| `PG_NET_TOKEN` | local | 32-byte hex (`openssl rand -hex 32`). Used by `/api/sync` auth gate (F-02 T-009). |
| `R2_ACCOUNT_ID` | T-007 | hex string from CF dashboard |
| `R2_ACCESS_KEY_ID` | T-007 | |
| `R2_SECRET_ACCESS_KEY` | T-007 | |
| `R2_BUCKET` | T-007 | `trainer-advisor-backups` |
| `R2_ENC_PASS` | local | passphrase for `openssl enc` in backup script |
| `APP_URL` | T-001 | `https://<domain>` — full URL with scheme |

(Note: `GITHUB_TOKEN` is automatic — don't add it manually.)

**Added LATER (not in F-03)**:

| Secret name | When added | Source |
|---|---|---|
| `GOOGLE_CLIENT_ID` | S-01 | Google Cloud Console (set up as part of first slice that uses OAuth) |
| `GOOGLE_CLIENT_SECRET` | S-01 | same |
| `BETTER_AUTH_URL` | T-010 commit time or here | `https://<domain>` (same as `APP_URL` for v1 single-host) |

Until S-01 adds the Google secrets, the deployed app cannot complete a real OAuth flow — but `pnpm dev` locally still works (S-01 development sets them in `.env.local` first).

## Acceptance

- [ ] 12 F-03 secrets visible in Repo Settings → Actions → Secrets (no `RESEND_*`, no `GOOGLE_CLIENT_*` yet)
- [ ] Names match exactly the references in `.github/workflows/deploy.yml` and `.github/workflows/backup.yml` (case-sensitive)
- [ ] `LIBSODIUM_MASTER_KEY` value matches `.env.local` byte-for-byte (sync critical)
- [ ] `SUPABASE_*_URL` values match `.env.local` (copied from F-01, not re-generated)
- [ ] All 3 locally-generated secrets (`BETTER_AUTH_SECRET`, `PG_NET_TOKEN`, `R2_ENC_PASS`) ALSO in password manager
- [ ] No trailing whitespace or newlines in pasted values
- [ ] Spot-check: `APP_URL` starts with `https://`, not `http://`

## Notes

GitHub doesn't let you read secrets back after creation (only the last 4
chars). Treat the password manager as the source of truth — GitHub is just
an encrypted runtime cache for CI/CD.
