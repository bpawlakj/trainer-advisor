---
id: T-006
title: Better Auth config + route handler + requireAuth helpers
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
commit: null
depends_on: [T-004, T-005]
blocks: [T-008, T-010]
plan_anchor: C2-C4
---

## Scope

Wire Better Auth as the app's identity layer: **Google OAuth as sole identity provider** (read-only Calendar scope, encrypted refresh tokens via libsodium) + DB-backed sessions. NO email/password — `emailAndPassword.enabled: false` is explicit. Expose a Next.js route handler for Better Auth's API endpoints and server-side `requireAuth()` / `getOptionalAuth()` helpers for Server Components and Route Handlers.

## Approach

Three files:

### 1. `src/lib/auth.ts`

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import { env } from '@/env';
import { encryptToken, decryptToken } from './crypto';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // Google is the SOLE identity provider — no email/password, no register flow,
  // no password-reset emails. Per PRD FR-001 (Google-only auth).
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: ['https://www.googleapis.com/auth/calendar.events.readonly'],
    },
  },
  // Encrypt OAuth refresh tokens at rest in trainer_google_tokens.
  // Schema bridge: Better Auth's account.refreshToken is encrypted via these hooks
  // before insert. Actual storage in our custom trainer_google_tokens table is
  // wired via an after-OAuth hook in S-01 — F-02 just proves the encryption
  // path works at the Better Auth layer.
  advanced: {
    encryptOAuthTokens: {
      encrypt: async (plaintext: string) => {
        const { nonce, ciphertext } = await encryptToken(plaintext);
        // Concat nonce + ciphertext base64 for Better Auth's string-only storage.
        return Buffer.concat([nonce, ciphertext]).toString('base64');
      },
      decrypt: async (encoded: string) => {
        const buf = Buffer.from(encoded, 'base64');
        const nonce = buf.subarray(0, 24); // sodium.crypto_secretbox_NONCEBYTES
        const ciphertext = buf.subarray(24);
        return decryptToken(nonce, ciphertext);
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
```

### 2. `src/app/api/auth/[...all]/route.ts`

```ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

### 3. `src/lib/auth-helpers.ts`

```ts
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from './auth';
import type { TrainerId } from '@/db/types';

export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return {
    trainerId: session.user.id as TrainerId,
    session,
  };
}

export async function getOptionalAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    trainerId: session.user.id as TrainerId,
    session,
  };
}
```

## Acceptance

- [ ] `src/lib/auth.ts` exists, exports `auth` + `Session` type
- [ ] `emailAndPassword.enabled: false` is explicit in config (grep for it)
- [ ] NO `sendResetPassword` callback in config (Google handles password recovery)
- [ ] NO `import { Resend }` in `src/lib/auth.ts` (Resend not used in v1)
- [ ] Google provider declared with `scope: ['https://www.googleapis.com/auth/calendar.events.readonly']` — verify by `grep -c 'calendar.events.readonly' src/lib/auth.ts` returns 1
- [ ] `encryptOAuthTokens` config calls into `src/lib/crypto.ts` (no inline crypto)
- [ ] `src/app/api/auth/[...all]/route.ts` exists, exports GET + POST via `toNextJsHandler(auth)`
- [ ] `src/lib/auth-helpers.ts` exports `requireAuth()` (redirects on absent session) + `getOptionalAuth()` (returns null)
- [ ] Both helpers return `{ trainerId, session }` object — `trainerId` typed as `TrainerId` branded
- [ ] `pnpm tsc --noEmit` passes

## Notes

- The Better Auth Drizzle adapter expects specific table names (`user`, `session`, `account`, `verification`). We renamed `user` → `trainers` in our schema. **Verify with Better Auth docs** whether the adapter supports table-name customization, OR adjust schema in T-003 to use `user` instead of `trainers`. If forced to use `user`, update `clients.trainer_id` FK to point at `user.id` (rename column? Or keep `trainer_id` as the variable name — table-side FK is to `user`, code-side semantic is `trainerId`).
- `Session` type-infer pattern: Better Auth exposes `$Infer.Session` which gives the typed session shape including the `user` field.
- No reset-password email in v1 — Google handles forgotten-password / account-recovery on their side. If a user can't access their Google account, they can't access the app (and they wouldn't have it set up anyway since the same Google account hosts their Calendar).
- Production `BETTER_AUTH_URL` value comes from F-03. For F-02 local dev: `http://localhost:3000`.
- `auth.api.getSession({ headers })` is the server-side session getter. Don't reach into cookies directly.
- `requireAuth()` is called server-side in Server Components and Route Handlers. Client-side auth state should use Better Auth's React client (`useSession`) — but F-02 doesn't ship any client component that needs it.
