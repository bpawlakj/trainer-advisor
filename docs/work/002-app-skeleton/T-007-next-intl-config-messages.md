---
id: T-007
title: next-intl routing config + Polish messages catalog
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
commit: null
depends_on: [T-001]
blocks: [T-008]
plan_anchor: D1-D3
---

## Scope

Wire next-intl with a single Polish locale, `Europe/Warsaw` timezone forced server-side, and a seed `pl.json` message catalog covering marketing landing + auth forms + protected `/today` placeholder strings.

## Approach

### 1. `src/i18n/routing.ts`

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pl'],
  defaultLocale: 'pl',
  localePrefix: 'as-needed',
});
```

### 2. `src/i18n/request.ts`

```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'pl')) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Europe/Warsaw',
  };
});
```

### 3. `src/messages/pl.json`

Seed catalog with 4 namespaces. Google-only auth = no `register`, no `resetPassword` keys. Single `Auth.login.*` namespace covers the entire identity surface.

```json
{
  "Common": {
    "appName": "Trainer Advisor",
    "signIn": "Zaloguj się",
    "signOut": "Wyloguj się",
    "loading": "Ładowanie...",
    "errorGeneric": "Coś poszło nie tak. Spróbuj ponownie."
  },
  "Marketing": {
    "tagline": "Frekwencja i przychód z Twoich treningów — bez przepisywania kalendarza.",
    "ctaSignInGoogle": "Zaloguj przez Google",
    "ctaSubline": "Używamy Twojego konta Google do logowania i odczytu Kalendarza (tylko odczyt)."
  },
  "Auth": {
    "login": {
      "title": "Zaloguj się",
      "ctaGoogle": "Zaloguj przez Google",
      "ctaSubline": "Jednym kliknięciem zalogujesz się do aplikacji i przyznasz dostęp do odczytu swojego Kalendarza Google.",
      "errorOAuth": "Logowanie nie powiodło się. Spróbuj ponownie."
    }
  },
  "Today": {
    "title": "Dzisiaj",
    "emptyState": {
      "title": "Brak sesji do oznaczenia",
      "description": "Twój Kalendarz Google jest podłączony — synchronizacja w toku.",
      "ctaRefresh": "Odśwież"
    }
  }
}
```

## Acceptance

- [ ] `src/i18n/routing.ts` exists with `locales: ['pl']`, `localePrefix: 'as-needed'`
- [ ] `src/i18n/request.ts` exists, returns `timeZone: 'Europe/Warsaw'`, locale validation, dynamic messages import
- [ ] `src/messages/pl.json` exists with the 4 namespaces above
- [ ] `pl.json` does NOT contain `register`, `resetPassword`, or `password` keys (Google-only auth)
- [ ] `pl.json` contains `Auth.login.ctaGoogle: "Zaloguj przez Google"` (the single auth call-to-action)
- [ ] JSON is valid (`pnpm exec json5 src/messages/pl.json` or `jq . src/messages/pl.json`)
- [ ] No raw English fallback strings — every user-facing string in `pl.json` is Polish
- [ ] `pnpm tsc --noEmit` passes (JSON imports work via Next.js default tsconfig)

## Notes

- `localePrefix: 'as-needed'` means URL has no `/pl` prefix when accessing the default locale (which is the only locale in v1). Future English addition would prefix English routes with `/en`.
- No `Auth.resetPassword.*` keys in v1 — Google handles forgotten-password on their side. The single auth surface is `Auth.login.ctaGoogle` ("Zaloguj przez Google") plus `Auth.login.errorOAuth` for failed OAuth completions.
- `timeZone: 'Europe/Warsaw'`: required by NFR. next-intl uses this for `date()` and `dateTime()` formatters — without setting it, server SSR renders dates in UTC and "today" can be wrong around midnight.
- Polish URL pathnames (`/dzisiaj`) are NOT used in v1 — folder names + URLs stay English per AGENTS.md. Adding `pathnames` config in `routing.ts` is a future polish if/when v2 needs URL translation.
