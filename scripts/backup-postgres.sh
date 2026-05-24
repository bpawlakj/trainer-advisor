#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Trainer Advisor — encrypted Postgres backup → Cloudflare R2
#
# Required env (sourced from .env or GitHub Actions secrets):
#   SUPABASE_DIRECT_URL   postgresql://... on port 5432 (NOT pooled)
#   R2_ACCOUNT_ID         Cloudflare account ID
#   R2_ACCESS_KEY_ID      R2 API token's access key
#   R2_SECRET_ACCESS_KEY  R2 API token's secret
#   R2_BUCKET             e.g. trainer-advisor-backups
#   R2_ENC_PASS           passphrase for AES-256-CBC encryption (32+ chars)
#
# Required tools:
#   pg_dump      (postgresql-client)
#   openssl      (encryption)
#   aws          (AWS CLI v2 — talks to R2 via S3-compat endpoint)
#
# Backup file format:
#   <bucket>/<YYYY>/<MM>/<YYYY-MM-DD>-<HHMM>.sql.gz.enc
#
# Restore (separate procedure):
#   aws s3 cp s3://$R2_BUCKET/... - --endpoint-url ... \
#     | openssl enc -aes-256-cbc -pbkdf2 -d -pass "pass:$R2_ENC_PASS" \
#     | gunzip \
#     | psql $SCRATCH_DB_URL
# ============================================================================

# Fail fast on missing env — security.md § Secret Management.
for var in SUPABASE_DIRECT_URL R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET R2_ENC_PASS; do
  if [[ -z "${!var:-}" ]]; then
    echo "[backup] missing env: $var" >&2
    exit 1
  fi
done

for cmd in pg_dump openssl aws gzip; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[backup] missing binary: $cmd" >&2
    exit 1
  fi
done

TIMESTAMP="$(date -u +%Y-%m-%d-%H%M)"
YEAR="${TIMESTAMP%%-*}"
MONTH="$(date -u +%m)"
KEY="${YEAR}/${MONTH}/${TIMESTAMP}.sql.gz.enc"

R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "[backup] dumping postgres -> gzip -> openssl -> R2://${R2_BUCKET}/${KEY}"

# Stream through pipes — no plaintext dump ever lands on disk.
# pg_dump → gzip → openssl enc → aws s3 cp from stdin.
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION=auto \
pg_dump \
  --dbname="$SUPABASE_DIRECT_URL" \
  --no-owner --no-acl --format=plain \
  | gzip -9 \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:${R2_ENC_PASS}" \
  | aws s3 cp - "s3://${R2_BUCKET}/${KEY}" --endpoint-url "$R2_ENDPOINT"

echo "[backup] OK: s3://${R2_BUCKET}/${KEY}"
