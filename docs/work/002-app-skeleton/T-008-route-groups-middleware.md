---
id: T-008
title: Route groups + middleware + next.config.ts plugin
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
commit: null
depends_on: [T-006, T-007]
blocks: [T-010]
plan_anchor: D4-D6
---

## Scope

Restructure `src/app/` into `[locale]` segment with three route groups: `(marketing)`, `(auth)`, `(protected)`. Wire `requireAuth()` into the protected group's layout. Compose next-intl middleware with an optimistic auth-cookie check. Wire next-intl plugin in `next.config.ts`.

## Approach

### 1. Move existing files

```
src/app/layout.tsx       → src/app/[locale]/layout.tsx
src/app/page.tsx         → src/app/[locale]/(marketing)/page.tsx
src/app/globals.css      → stays at src/app/globals.css (root)
src/app/favicon.ico      → stays at src/app/favicon.ico
src/app/api/             → stays at src/app/api/ (routes are locale-agnostic)
```

### 2. Update `src/app/[locale]/layout.tsx`

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import './globals.css'; // adjust path: '../globals.css'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as 'pl')) notFound();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 3. Create the three group layouts

`src/app/[locale]/(marketing)/layout.tsx` — public layout (header with Sign-in CTA), no auth check.

`src/app/[locale]/(auth)/layout.tsx` — centered card layout for login/register/reset-password.

`src/app/[locale]/(auth)/login/page.tsx`, `register/page.tsx`, `reset-password/page.tsx` — form skeletons using Better Auth's React client (`createAuthClient` from `better-auth/react`). Minimal forms — full styling lands later.

`src/app/[locale]/(protected)/layout.tsx`:

```tsx
import { requireAuth } from '@/lib/auth-helpers';

export default async function ProtectedLayout({
  children,
}: { children: React.ReactNode }) {
  await requireAuth(); // redirects to /login if no session
  return <>{children}</>;
}
```

`src/app/[locale]/(protected)/today/page.tsx`:

```tsx
import { useTranslations } from 'next-intl';

export default function TodayPage() {
  const t = useTranslations('Today');
  return (
    <main>
      <h1>{t('title')}</h1>
      <section>
        <h2>{t('emptyState.title')}</h2>
        <p>{t('emptyState.description')}</p>
        <button>{t('emptyState.ctaConnect')}</button>
      </section>
    </main>
  );
}
```

### 4. `src/middleware.ts`

```ts
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Optimistic auth cookie check for protected paths.
  // Real auth check is in (protected)/layout.tsx via requireAuth() —
  // middleware-only is NOT SECURE per Better Auth docs.
  const isProtected = /^\/(pl\/)?(today|clients|summary)/.test(pathname);
  if (isProtected && !getSessionCookie(req)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
};
```

### 5. `next.config.ts` — wire next-intl plugin

```ts
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  // existing config...
  output: 'standalone', // already set by F-01 era for Dockerfile (per F-03 plan-v2.md)
};

export default withNextIntl(nextConfig);
```

## Acceptance

- [ ] `src/app/[locale]/layout.tsx` exists, wraps children in `NextIntlClientProvider`, sets `<html lang={locale}>`
- [ ] Three route groups exist under `src/app/[locale]/`: `(marketing)`, `(auth)`, `(protected)`
- [ ] `(protected)/layout.tsx` calls `requireAuth()`
- [ ] `(auth)/login/page.tsx`, `register/page.tsx`, `reset-password/page.tsx` exist as form skeletons
- [ ] `(protected)/today/page.tsx` renders Polish placeholder from `pl.json`
- [ ] `src/middleware.ts` exists, composes next-intl middleware with Better Auth cookie check
- [ ] `next.config.ts` wraps config with `withNextIntl('./src/i18n/request.ts')`
- [ ] `pnpm dev` boots without errors
- [ ] Visit `http://localhost:3000/` → marketing landing page renders Polish
- [ ] Visit `http://localhost:3000/today` (signed out) → middleware redirects to `/login`
- [ ] After sign-in → `/today` renders Polish placeholder
- [ ] `pnpm tsc --noEmit` passes

## Notes

- The `(auth)` route group uses Better Auth's React client. Create `src/lib/auth-client.ts`:
  ```ts
  import { createAuthClient } from 'better-auth/react';
  export const authClient = createAuthClient();
  ```
  Use `authClient.signIn.email({ email, password })` etc. in form `onSubmit` handlers.
- Form skeleton minimum: HTML form with controlled `useState` inputs, calls `authClient.*`, displays inline error. Pretty styling is post-MVP.
- The middleware matcher excludes `/api/*` — auth route at `/api/auth/[...all]` is hit directly by Better Auth's React client, bypassing the i18n middleware.
- `[locale]` segment wraps the WHOLE app — including `(protected)` and `(auth)`. So routes look like `/login`, `/register`, `/today` (no `/pl` prefix because `localePrefix: 'as-needed'`).
- `getSessionCookie(req)` returns truthy if Better Auth's session cookie exists. It does NOT validate the session — that's `requireAuth()`'s job server-side. This is correct: middleware is fast/cheap, layout is authoritative.
- `notFound()` call in locale layout handles bogus locale (e.g. `/zz/today` → 404).
