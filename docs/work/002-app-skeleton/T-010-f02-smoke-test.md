---
id: T-010
title: F-02 10-point smoke test verification + roadmap status flip
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
commit: null
depends_on: [T-002, T-004, T-006, T-008, T-009]
blocks: []
plan_anchor: E3
---

## Scope

Run the 10-point F-02 verification suite from `plan.md` § Verification. All must pass before flipping F-02 status to `done` in `docs/roadmap.md`. This is the gate that says "app skeleton ready — S-01 unblocked."

## Approach

Run each check; mark ✓ in the acceptance list below. If any fail, fix in the responsible upstream task (T-001..T-009), don't paper over here.

### 1. Packages installed

```bash
pnpm ls better-auth drizzle-orm postgres next-intl libsodium-wrappers zod resend
```
Expected: all listed with versions, no `(missing)`.

### 2. Env schema fails fast

Temporarily remove `BETTER_AUTH_SECRET` from `.env.local`. Run `pnpm dev`. Expected: crash with Zod error naming the missing key, BEFORE serving any request. Restore key afterward.

### 3. DB migration applied (NOT NULL discipline)

```bash
psql "$SUPABASE_DIRECT_URL" -c "\dt"
psql "$SUPABASE_DIRECT_URL" -c "\d clients" | grep trainer_id
psql "$SUPABASE_DIRECT_URL" -c "\d trainer_google_tokens" | grep -E "(nonce|ciphertext)"
```
Expected: 9+ tables; `trainer_id ... not null`; `nonce bytea not null` + `ciphertext bytea not null`.

### 4. Supavisor pooled connection works

```bash
pnpm dev  # in one terminal
curl http://localhost:3000/api/health  # in another
```
Expected: 200 OK (proves no "prepared statement" errors from Supavisor under first DB query).

### 5. Login page renders Google-only

Visit `http://localhost:3000/login`. Expected: page shows title (Polish), subline (Polish), single "Zaloguj przez Google" button. **NO email input, NO password input, NO register link, NO forgot-password link visible anywhere in the UI.** Clicking the button redirects to Google's OAuth consent screen (full OAuth round-trip + token storage check is deferred to S-01 — F-02 just verifies the button + redirect).

### 6. Sign-in + protected redirect

Sign out. Visit `/today` directly. Expected: 302 → `/login`. Sign in. Expected: `/today` renders Polish placeholder text.

### 7. Google provider scaffolded (no full OAuth flow)

```bash
grep -c 'calendar.events.readonly' src/lib/auth.ts
```
Expected: `1`. Full OAuth-flow verification (consent screen + token encryption) is **deferred to S-01** — F-02 only proves the scaffold is in place.

### 8. `trainer_google_tokens` accepts bytea

```bash
psql "$SUPABASE_DATABASE_URL" -c "
  INSERT INTO trainer_google_tokens (trainer_id, nonce, ciphertext, scope)
  VALUES ('<existing-trainer-id>', '\\x00112233'::bytea, '\\xaabbccdd'::bytea, 'test');
"
psql "$SUPABASE_DATABASE_URL" -c "SELECT trainer_id, encode(nonce,'hex'), encode(ciphertext,'hex') FROM trainer_google_tokens;"
```
Expected: insert succeeds; select returns hex-encoded bytes. Clean up: `DELETE FROM trainer_google_tokens WHERE scope='test';`.

### 9. i18n loads Polish

Visit `/`. Expected: heading and visible strings are Polish (from `pl.json` `Marketing.*`). NO `Common.appName` literal placeholders visible.

### 10. Sync stub auth gate

```bash
curl -X POST -H "Authorization: Bearer $PG_NET_TOKEN" http://localhost:3000/api/sync
curl -X POST http://localhost:3000/api/sync
curl -X POST -H "Authorization: Bearer wrong" http://localhost:3000/api/sync
```
Expected: 200 / 401 / 401.

### Post-verification — flip status

Edit `docs/roadmap.md`:
- `### F-02:` section → `**Status:** done` (was `ready`)
- Move F-02 block from `## Foundations` to (or annotate inline that) F-02 closed

Run `bash ~/.claude/scripts/regenerate-status.sh` → STATUS.md updates 002-app-skeleton to Done.

Commit (one commit closing F-02): `feat(skeleton): close F-02 — app skeleton ready, S-01 unblocked`.

## Acceptance

- [ ] Check 1 passed — packages installed
- [ ] Check 2 passed — env schema fails fast
- [ ] Check 3 passed — DB migration shows `trainer_id NOT NULL` + bytea NOT NULL
- [ ] Check 4 passed — Supavisor pooled connection works
- [ ] Check 5 passed — Google-only login page (no email/password/register/reset UI), button redirects to Google
- [ ] Check 6 passed — protected redirect + post-login render
- [ ] Check 7 passed — Google provider scope `calendar.events.readonly` present
- [ ] Check 8 passed — bytea insert/select roundtrip
- [ ] Check 9 passed — Polish strings render
- [ ] Check 10 passed — sync stub auth gate (200/401/401)
- [ ] `docs/roadmap.md` F-02 status flipped to `done`
- [ ] STATUS.md regenerated, 002-app-skeleton appears in Done section
- [ ] All commits pushed

## Notes

- This task is verification + small docs edit only — no new code. If a check fails, the fix lives in the upstream task (T-001..T-009), not here.
- Check 5 in v1: no email/password sign-up exists. The login page IS the entire identity surface. If "Zaloguj przez Google" button works (visible + redirects to accounts.google.com), Check 5 passes. Real OAuth round-trip (consent screen → callback → trainer row inserted → token encrypted) is S-01 verification work, not F-02.
- Check 7 + Check 8 are the F-02-scoped slices of what was originally one verification step (Google OAuth + token encryption end-to-end). The full e2e check moves to S-01 because it needs a real Google Cloud Console OAuth client, which isn't set up yet (deferred per roadmap restructure).
- If you want to fold this T-010 into T-008's PR rather than a separate one: fine. Verification is small. But splitting keeps "implementation done" and "verified ready to ship" as two distinct gates.
