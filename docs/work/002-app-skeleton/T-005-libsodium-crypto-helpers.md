---
id: T-005
title: libsodium crypto helpers (encryptToken/decryptToken)
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
commit: null
depends_on: [T-001]
blocks: [T-006]
plan_anchor: C1
---

## Scope

Create `src/lib/crypto.ts` — thin wrapper around `libsodium-wrappers` exposing two functions used by Better Auth to encrypt/decrypt Google OAuth refresh tokens at rest. Master key from `env.LIBSODIUM_MASTER_KEY`.

## Approach

`src/lib/crypto.ts`:

```ts
import sodium from 'libsodium-wrappers';
import { env } from '@/env';

let ready: Promise<void> | null = null;

function ensureReady() {
  ready ??= sodium.ready;
  return ready;
}

function getMasterKey(): Uint8Array {
  // env.LIBSODIUM_MASTER_KEY is 64 hex chars = 32 bytes (validated by Zod)
  return sodium.from_hex(env.LIBSODIUM_MASTER_KEY);
}

export async function encryptToken(plaintext: string): Promise<{
  nonce: Buffer;
  ciphertext: Buffer;
}> {
  await ensureReady();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(
    sodium.from_string(plaintext),
    nonce,
    getMasterKey()
  );
  return { nonce: Buffer.from(nonce), ciphertext: Buffer.from(ciphertext) };
}

export async function decryptToken(
  nonce: Buffer,
  ciphertext: Buffer
): Promise<string> {
  await ensureReady();
  const plaintext = sodium.crypto_secretbox_open_easy(
    new Uint8Array(ciphertext),
    new Uint8Array(nonce),
    getMasterKey()
  );
  if (!plaintext) throw new Error('Failed to decrypt token — wrong key or tampered ciphertext');
  return sodium.to_string(plaintext);
}
```

Optional: add a small Vitest spec at `src/lib/crypto.test.ts` proving `decryptToken(encryptToken(x)) === x`. Skip if test runner isn't set up yet — F-02 doesn't include test infra setup.

## Acceptance

- [ ] `src/lib/crypto.ts` exists, exports `encryptToken` + `decryptToken`
- [ ] Both functions await `sodium.ready` on first call
- [ ] Master key read via `env.LIBSODIUM_MASTER_KEY` (NOT `process.env`)
- [ ] `pnpm tsc --noEmit` passes
- [ ] Manual smoke (Node REPL): import + roundtrip succeeds
  ```
  > const c = await import('./src/lib/crypto.ts');
  > const { nonce, ciphertext } = await c.encryptToken('hello');
  > await c.decryptToken(nonce, ciphertext);
  'hello'
  ```

## Notes

- libsodium-wrappers uses async-init (`sodium.ready`). Calling crypto functions before `ready` resolves returns undefined silently. Always `await ensureReady()` first.
- `crypto_secretbox_NONCEBYTES = 24`, `crypto_secretbox_KEYBYTES = 32`. Master key validated as 64 hex by Zod schema in T-001 = 32 bytes. ✓
- Buffer ↔ Uint8Array conversions: postgres-js bytea columns surface as Buffer in Node; libsodium expects Uint8Array. Wrap appropriately.
- Decryption failure (`null` return from `crypto_secretbox_open_easy`) means EITHER wrong key OR tampered ciphertext. Don't leak which in error messages.
- This is the only place `LIBSODIUM_MASTER_KEY` is used. Better Auth's `encryptOAuthTokens` callback (T-006) calls these two functions.
