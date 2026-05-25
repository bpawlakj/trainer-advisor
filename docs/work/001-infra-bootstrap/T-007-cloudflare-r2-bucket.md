---
id: T-007
title: Cloudflare R2 bucket + scoped API token
status: pending
plan: ../plan-v2.md
created: 2026-05-25
completed: null
commit: null
depends_on: []
blocks: [T-009]
plan_anchor: A7-cloudflare-r2
---

## Scope

Stand up the Cloudflare R2 bucket that nightly Postgres dumps land into
(via `scripts/backup-postgres.sh` driven by `.github/workflows/backup.yml`).
R2 free tier covers 10 GB storage + 1M Class-A ops/month — far more than the
backups will use.

Outputs:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` = `trainer-advisor-backups`
- API token scoped to ONLY that bucket (least privilege)

## Approach

1. Sign up at https://dash.cloudflare.com/sign-up if no CF account yet.
   (If using Cloudflare Registrar from T-001, the account already exists.)
2. Sidebar → **R2 Object Storage** → **Create bucket**:
   - Name: `trainer-advisor-backups`
   - Location: **Automatic (EU)** — keeps backups in EU jurisdiction
3. R2 → **Manage R2 API Tokens** → **Create API token**:
   - Token name: `trainer-advisor-backup`
   - Permissions: **Object Read & Write**
   - Specify bucket: `trainer-advisor-backups` only
   - TTL: leave unbounded (rotate manually once a year)
4. Copy:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (shown once only)
   - **Account ID** (from URL or dashboard) → `R2_ACCOUNT_ID`
5. Save all three in password manager.

## Acceptance

- [ ] R2 bucket `trainer-advisor-backups` exists, EU location
- [ ] API token created with scope = bucket-only Object Read+Write
- [ ] All 3 credentials saved for T-009
- [ ] Manual smoke test (optional now, required at T-012):
      `aws s3 ls s3://trainer-advisor-backups --endpoint-url https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` returns 0 rows
