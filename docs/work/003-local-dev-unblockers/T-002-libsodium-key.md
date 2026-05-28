---
id: T-002
title: Generate libsodium master key + save to .env.local
status: done
plan: ../plan.md
created: 2026-05-27
completed: 2026-05-28
commit: null
depends_on: []
blocks: [F-02]
plan_anchor: Phase-B
---

## Scope

Generate a 32-byte random key in hex, save as `LIBSODIUM_MASTER_KEY` in local `.env.local`, and back it up to a password manager. This key encrypts Google OAuth refresh tokens at rest in the `trainer_google_tokens` table (set up in F-02). Losing the key means re-authorizing Google for every connected trainer — back it up.

## Approach

1. Generate the key:

   ```bash
   openssl rand -hex 32
   ```

2. Copy the output (64 hex chars = 32 bytes).
3. Add to `.env.local`:

   ```
   LIBSODIUM_MASTER_KEY=<64-hex-chars>
   ```

4. Back up the same value to your password manager under entry "trainer-advisor / LIBSODIUM_MASTER_KEY (v1)". If `.env.local` is lost (laptop dies, accidental git clean, etc.) you can restore from the manager — without it, every Google-connected trainer must re-auth.

## Acceptance

- [x] `.env.local` contains a line matching `^LIBSODIUM_MASTER_KEY=[0-9a-f]{64}$` — verified 2026-05-28
- [x] Same value stored in password manager — user-confirmed responsibility
- [x] `git check-ignore .env.local` exits 0 (file gitignored)
- [x] Value generated via `openssl rand -hex 32` on user's local machine

## Completion notes (2026-05-28)

- Key generated locally, written to `.env.local` line 17.
- **Reminder to user**: back up the key value to password manager under entry "trainer-advisor / LIBSODIUM_MASTER_KEY (v1)" if not already done — losing this key orphans every encrypted Google OAuth refresh token (re-auth required for each connected trainer).
- F-01 fully done: F-02 unblocked (both T-001 + T-002 complete). Next: F-02 T-001 (install packages + Zod env schema).

## Notes

- Pure local work — no third-party account.
- This is a one-time setup. Key rotation is a v2 concern (currently no rotation policy — single key for life of v1, per `plan.md` § "Out of scope").
- The key is consumed by `src/lib/crypto.ts` in F-02 T-005. Both encrypt and decrypt operations read from `env.LIBSODIUM_MASTER_KEY`.
- 32 bytes / 64 hex chars matches libsodium `crypto_secretbox_KEYBYTES`.
