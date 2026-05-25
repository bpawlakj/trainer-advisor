---
id: T-009
title: Configure GitHub Actions secrets
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: [T-002, T-004, T-005, T-006, T-007, T-008]
blocks: [T-011]
plan_anchor: A1-github-secrets
---

## Scope

Populate the 17 secrets the deploy + backup workflows expect (per
`.env.example` + workflow YAMLs). 3 of them are generated locally; the rest
come from prior Phase A tasks.

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
17 entries, one paste each:

| Secret name | Source | Notes |
|---|---|---|
| `HETZNER_HOST` | T-002 | IPv4 only, no port |
| `HETZNER_SSH_KEY` | T-008 | Full private key file content incl. `-----BEGIN...END-----` lines |
| `SUPABASE_DATABASE_URL` | T-004 | Pooled, port 6543, includes `?pgbouncer=true` |
| `SUPABASE_DIRECT_URL` | T-004 | Direct, port 5432 |
| `BETTER_AUTH_SECRET` | local | 64 hex chars from `openssl rand -hex 32` |
| `LIBSODIUM_MASTER_KEY` | local | 64 hex chars |
| `GOOGLE_CLIENT_ID` | T-005 | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | T-005 | |
| `RESEND_API_KEY` | T-006 | starts with `re_` |
| `RESEND_FROM` | T-006 | e.g. `trener@<domain>` |
| `R2_ACCOUNT_ID` | T-007 | hex string from CF dashboard |
| `R2_ACCESS_KEY_ID` | T-007 | |
| `R2_SECRET_ACCESS_KEY` | T-007 | |
| `R2_BUCKET` | T-007 | `trainer-advisor-backups` |
| `R2_ENC_PASS` | local | passphrase for `openssl enc` in backup script |
| `APP_URL` | T-001 | `https://<domain>` — full URL with scheme |

(Note: `GITHUB_TOKEN` is automatic — don't add it manually.)

## Acceptance

- [ ] All 17 secrets visible in Repo Settings → Actions → Secrets
- [ ] Names match exactly the references in `.github/workflows/deploy.yml`
      and `.github/workflows/backup.yml` (case-sensitive)
- [ ] All 3 locally-generated secrets ALSO in password manager
- [ ] No trailing whitespace or newlines in pasted values
- [ ] Spot-check: `APP_URL` starts with `https://`, not `http://`

## Notes

GitHub doesn't let you read secrets back after creation (only the last 4
chars). Treat the password manager as the source of truth — GitHub is just
an encrypted runtime cache for CI/CD.
