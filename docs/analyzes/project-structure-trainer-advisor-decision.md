---
title: Project structure for Trainer Advisor (Next.js 15 App Router + Drizzle + Better Auth + next-intl)
date: 2026-05-22
type: decision
status: decided
decision: "src/ layout with route groups + [locale] segment; Drizzle schema split by entity with trainer_id NOT NULL on every business table from day 1; native Next.js PWA (no serwist); Biome + Lefthook + pnpm + Vitest + Playwright + PGlite; GitHub Actions → GHCR → SSH deploy."
related:
  - docs/product-spec.md
  - docs/analyzes/language-and-infrastructure-stack-decision.md
---

# Project structure for Trainer Advisor

## Context

The preceding research [`language-and-infrastructure-stack-decision.md`](./language-and-infrastructure-stack-decision.md) locked the stack: Next.js 15 (App Router) + TypeScript + Better Auth + Drizzle + Supabase Postgres (Frankfurt) + Hetzner CX22 VPS + libsodium token encryption. That document does **not** answer how the source tree should be organized — and the organization decision is load-bearing for a 5-week solo MVP. The wrong layout can burn 2-3 days on premature abstraction (over-cleverness) or 2-3 days on late refactoring (under-thinking). Both are fatal at this timeline.

The product spec defines three feature areas (Google Calendar OAuth + sync, daily attendance marking, monthly settlement dashboard), Polish UI, mobile-first PWA, single-tenant v1 with multi-tenant v2. The structure must support all of these without forcing a rewrite when multi-tenant arrives.

## Question

Given the locked stack (Next.js 15 App Router + TS + Drizzle + Better Auth + next-intl + libsodium + Hetzner) and the product profile (solo dev, 5-week MVP, Polish-only PWA, single-tenant v1, multi-tenant v2), what directory layout, naming conventions, tooling, and file placement should the project adopt on day 1?

## Findings

### Top-level layout — `src/` directory

Next.js 15 [`create-next-app`](https://nextjs.org/docs/app/getting-started/installation) defaults to `src/` in 2026. Keeping the repo root for config files only (Dockerfile, `*.config.ts`, `package.json`) and the app code under `src/` is the official convention and matches every contemporary template (T3 Stack, Next.js examples, Better-T-Stack). Reference: [Next.js — Project Structure](https://nextjs.org/docs/app/getting-started/project-structure).

### Route organization — route groups + `[locale]` segment

App Router's [route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) `(name)` give layout isolation without URL segments. Use three groups:

- `(marketing)` — public landing.
- `(auth)` — login/signup/reset, separate layout (no app shell).
- `(protected)` — authenticated routes, layout calls `requireAuth()`.

**Folder names stay in English** (`today`, `clients`, `summary/[month]`, `login`, `register`, `reset-password`) — code identifiers are a separate concern from UI strings. The spec requires Polish *user-facing* strings (labels, buttons, FR-017 message); it does not require Polish folder/route names. Wrap the entire app in a `[locale]` segment with [next-intl `localePrefix: 'as-needed'`](https://next-intl.dev/docs/routing).

If the **URLs themselves** must be Polish (e.g. for SEO, sharing readability, or aesthetic preference), use [next-intl localized pathnames](https://next-intl.dev/docs/routing/pathnames) to map English internal paths to Polish URLs:

```ts
// src/i18n/routing.ts
export const routing = defineRouting({
  locales: ['pl'],
  defaultLocale: 'pl',
  localePrefix: 'as-needed',
  pathnames: {
    '/today': { pl: '/dzisiaj' },
    '/clients': { pl: '/klienci' },
    '/clients/[id]': { pl: '/klienci/[id]' },
    '/summary/[month]': { pl: '/podsumowanie/[miesiac]' },
    '/login': { pl: '/logowanie' },
    '/register': { pl: '/rejestracja' },
    '/reset-password': { pl: '/reset-hasla' },
  },
});
```

The folder structure stays English (`app/[locale]/(protected)/today/page.tsx`); next-intl rewrites the URL the browser sees. This is the recommended default when both Polish URLs and English code are desired. Skip the `pathnames` mapping if English URLs are acceptable — `/today` is shorter than `/dzisiaj` anyway and unambiguous for the founder.

`app/api/` route handlers are reserved for: (1) Better Auth catch-all `auth/[...all]/route.ts`, (2) Google Calendar sync endpoint `google/sync/route.ts` (called by Supabase `pg_cron`), (3) webhook endpoints if push notifications are ever added. Form mutations use [Server Actions](https://nextjs.org/docs/app/getting-started/updating-data) co-located in `src/actions/` (cross-route) or `_actions.ts` (route-private).

### Component organization — hybrid

- `src/components/ui/` — shadcn primitives (CLI default — keep).
- `src/components/` — cross-route shared (app shell, nav, layout chrome).
- `app/[locale]/(protected)/today/_components/` — route-private (underscore prefix excludes from routing per [Next.js convention](https://nextjs.org/docs/app/getting-started/project-structure#private-folders)).
- No `.client.tsx` suffix — rely on `"use client"` directive only.

### Database layer — Drizzle, split by entity

Per the [productdevbook 2025 Drizzle guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717), for 5-10 tables, split by entity under `src/db/schema/<entity>.ts` with a barrel `index.ts`. A single `schema.ts` rots past 5 tables; feature-colocated schemas (`features/clients/schema.ts`) fragment the "this is the database" mental model.

Tables in v1:
- `trainers` — Better Auth user (PK).
- `trainer_google_tokens` — encrypted refresh tokens: `trainer_id PK/FK`, `nonce bytea`, `ciphertext bytea`, `expires_at`, `scope`.
- `clients` — trainer's clients: `id`, `trainer_id FK NOT NULL`, name, email (REQUIRED — see spec FR-004), phone, rate_pln, status.
- `calendar_events` — synced from Google: `id`, `trainer_id NOT NULL`, `google_event_id`, `client_id FK nullable`, `starts_at`, `ends_at`, `status`, `raw jsonb`. `UNIQUE(trainer_id, google_event_id)` — Google IDs aren't globally unique.
- `attendance_records` — per-event marking: `id`, `trainer_id NOT NULL`, `calendar_event_id UNIQUE FK`, `client_id`, `attended bool`, `rate_pln_snapshot` (per spec FR-014), `marked_at`.
- `app_settings` — per-trainer prefs: `trainer_id PK`, `timezone`, `default_session_minutes`, jsonb prefs.

`trainer_id NOT NULL` on every business table from day 1. [PlanetScale](https://planetscale.com/blog/approaches-to-tenancy-in-postgres) and [Crunchy Data](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy) both quantify the cost asymmetry: ~2-4 days to design in vs 4-8 weeks plus security review to retrofit.

> Ref: docs/product-spec.md — Guardrails: "Even though v1 is single-trainer, the data model and access checks must not foreclose future multi-tenant." This is satisfied by `trainer_id NOT NULL` from day 1 + query functions that take `trainerId` as first arg.

### Migrations — Drizzle Kit, `drizzle/` at root

`drizzle-kit generate` outputs to `./drizzle/` (default location). Use `generate` + `migrate` from the first deploy — `drizzle-kit push` is reserved for local dev shape-iteration. The [Zenn "56 migrations in production" post-mortem](https://zenn.dev/azuma317/articles/drizzle-migration-supabase-production?locale=en) is unambiguous: `push` in production silently drops data. Better Auth's tables (`user`, `session`, `account`, `verification`) are managed by the same Drizzle migrations (Better Auth ships Drizzle schemas) — no conflict with Supabase's own `auth.*` schema since Better Auth uses `public.user` not `auth.users`.

### Connection — Supavisor pooled, `prepare: false`

`src/db/index.ts` exports a `db` singleton using `postgres-js` driver with `prepare: false` (Supavisor transaction-mode requirement per [Supabase Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)). Pooled connection (port 6543) for app code; direct connection (port 5432, env var `DIRECT_URL`) for `drizzle-kit migrate`. Cache the client on `globalThis` in dev to survive HMR.

### Authorization — app-layer, skip RLS for v1

[Makerkit's Better Auth + Drizzle reference](https://makerkit.dev/docs/nextjs-drizzle/security/overview) does all authorization at the app layer because Better Auth doesn't issue Postgres JWTs (so Supabase's `auth.uid()` policies don't work out of the box). For v1, every query function takes `trainerId` as first arg — `db/queries/clients.ts` exports `listClients(trainerId)`, `getClient(trainerId, id)`, etc. This is the invariant: no DB call without an explicit `trainerId` scoping arg.

For v2, revisit RLS as defense-in-depth — Drizzle's [RLS API](https://orm.drizzle.team/docs/rls) (`pgPolicy`, `pgRole`) is stable, and the migration is mechanical because `trainer_id` is already everywhere. Logged as Open Question.

### Auth integration — Better Auth + next-intl composed middleware

Better Auth instance at `src/lib/auth.ts` (official [Better Auth Next.js docs](https://www.better-auth.com/docs/integrations/next)). Middleware composes both libraries — next-intl handles locale routing, Better Auth's `getSessionCookie` from `better-auth/cookies` does an optimistic cookie-presence check ([discussion #341](https://github.com/amannn/next-intl/discussions/341)):

```ts
// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { getSessionCookie } from 'better-auth/cookies';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18n = createMiddleware(routing);
// Matches both English internal paths and Polish localized URLs (if pathnames mapping is enabled).
const PROTECTED = [/^\/(pl\/)?(today|clients|summary|dzisiaj|klienci|podsumowanie)/];

export default function middleware(req: NextRequest) {
  if (PROTECTED.some(r => r.test(req.nextUrl.pathname))) {
    if (!getSessionCookie(req)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
  return handleI18n(req);
}
```

Real auth check still happens per-page via a `requireAuth()` helper in `src/lib/auth-helpers.ts` called from `(protected)/layout.tsx`. Better Auth docs explicitly warn: full validation in middleware alone is ["NOT SECURE"](https://www.better-auth.com/docs/integrations/next).

### i18n — single-locale-now, two-locale-ready

- `src/i18n/routing.ts` — `defineRouting({ locales: ['pl'], defaultLocale: 'pl', localePrefix: 'as-needed' })`.
- `src/i18n/request.ts` — `getRequestConfig` sets `timeZone: 'Europe/Warsaw'` so every server-side date format is timezone-explicit. next-intl has [no global `timeZone` setting](https://next-intl.dev/docs/usage/dates-times) — must be passed per-call or via request config.
- `src/messages/pl.json` — all UI strings. Polish CLDR plurals (`one`/`few`/`many`) supported natively via ICU syntax (e.g. `{count, plural, one {klient} few {klientów} many {klientów}}`).
- Polish currency: `Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })` yields `"1 200,50 zł"` on Node 22+ (V8 ICU). Matches spec.

### Email — React Email + Resend

[React Email](https://react.email) templates at `src/emails/` (e.g. `reset-password.tsx`). Polish hardcoded in JSX for v1 — [React Email has no built-in i18n](https://github.com/resend/react-email/issues/431). For v2, accept `locale` prop and use `getTranslations({ locale })` from next-intl's server API.

Better Auth's `sendResetPassword` hook ([email-password docs](https://www.better-auth.com/docs/authentication/email-password)) wires to Resend. **Critical:** `void` the send (don't `await`) to prevent timing attacks revealing whether an email exists.

### Session — DB-backed (Better Auth default)

[Better Auth session docs](https://www.better-auth.com/docs/concepts/session-management) recommend database sessions: trivial revocation, no Redis to operate. For v1 single-trainer low-QPS, the per-request DB roundtrip is invisible. Add the `cookieCache` plugin (5-min TTL) only after measuring latency. Multi-tenant v2 should keep DB sessions and add secondary Redis caching, not switch to JWT-only.

### PWA — native Next.js, skip serwist

Spec puts offline OUT of scope for v1. [Next.js 15+ PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) explicitly states Serwist is only needed for offline/Workbox precaching. For installable-shell-only:

- `src/app/manifest.ts` — typed `MetadataRoute.Manifest` (`name: 'Trener'`, `short_name: 'Trener'`, `theme_color`, `lang: 'pl'`, icons array).
- `public/icons/icon-{192,512,maskable-512}.png`, `apple-touch-icon.png` — generated via [realfavicongenerator.net](https://realfavicongenerator.net/).
- No service worker on day 1. If push notifications are added later, drop a hand-written `public/sw.js` registered from a client component.

This shaves a dependency, a webpack config branch, and a `public/sw.js` build artifact. Revisit serwist when offline becomes in-scope (post-MVP, possibly never).

### Tooling — Biome + Lefthook + pnpm

- **Biome** ([biomejs.dev](https://biomejs.dev)) — single binary, 15-25× faster than ESLint+Prettier, one `biome.json` config. The 20% missing rules (no type-aware lints, no `eslint-plugin-jsx-a11y` parity) don't matter at MVP scale. Pin Biome version in `package.json` to avoid monthly minor-breaking changes.
- **Lefthook** ([github.com/evilmartians/lefthook](https://github.com/evilmartians/lefthook)) — single YAML config, parallel hook execution, Go binary, no Husky+lint-staged glue.
- **pnpm** — universal Node compatibility, fastest stable, best Docker layer caching. Bun's 95% compatibility is a 5-week-MVP risk.
- **Node 22 LTS** pinned via `.nvmrc`.

### Testing — Vitest + Testing Library + Playwright + PGlite

- **Unit/component**: [Vitest](https://vitest.dev) (drop-in Jest API, 10-28× faster, native ESM). Co-located `Foo.test.tsx` next to `Foo.tsx` per [Next.js community consensus](https://github.com/vercel/next.js/discussions/23959).
- **E2E**: [Playwright](https://playwright.dev) in `e2e/` at project root (matches `npm init playwright` default).
- **DB tests**: [PGlite](https://github.com/electric-sql/pglite) via `drizzle-orm/pglite` — ~2.8s vs Testcontainers ~4.8s, no Docker, parallelizable.
- **Skipped**: Storybook, Chromatic, visual-regression. Bikeshed bait at MVP scale.

### CI/CD — GitHub Actions + SSH deploy

Skip Coolify/Dokploy for now — stateful PaaS on the same CX22 adds a 2am-debug surface. A 60-line GitHub Actions workflow: test → typecheck → docker build → push to GHCR → SSH `docker compose pull && up -d`. Free, transparent, reversible. Revisit Coolify in v2 when multi-service orchestration or preview environments matter.

## Alternatives considered

- **Layout A — `src/` + route groups + `[locale]` + entity-split Drizzle schema + Biome/Lefthook/PGlite (CHOSEN).** Pros: every convention is justified by a known v2 migration cost; standard contemporary Next.js conventions; multi-tenant + multi-lingual paths are free insurance. Cons: ~12 conventions to internalize before first business code; pinning version-fragile tools (Biome, Lefthook) is required. Verdict: best fit; mitigations are cheap.

- **Layout B — `create-next-app` defaults + single `db/schema.ts` + ESLint+Prettier + vanilla Vitest + Husky.** Pros: 2-3 days faster to first commit; familiar toolchain; lower surface area. Cons: re-splitting schema, migrating off ESLint, and adding `[locale]` later costs more than embracing them now; `trainer_id` discipline is harder to enforce without a "queries-take-trainerId" convention baked into the file structure. Verdict: viable for a 1-week prototype, weaker for a 5-week MVP that has v2 plans.

- **Layout C — Feature-based folders (`src/features/attendance/{schema,queries,components,actions}.ts`).** Pros: stronger encapsulation; better re-use story for v2 physio/massage service lines. Cons: duplicates the route-folder hierarchy; premature abstraction at 3 features; community templates for App Router don't endorse it for sub-medium apps. Verdict: revisit when features outgrow route folders, not now.

- **Layout D — No `[locale]` (cookie-only, `localePrefix: 'never'`).** Pros: simpler URLs (`/today` everywhere), no `[locale]` folder noise, no migration cost if English never ships. Cons: future-English migration would force URL changes (broken indexed URLs, broken Better Auth `redirectTo` config). Verdict: tempting if English-never is certain; the cost of keeping `[locale]` now is ~1 hour, the cost of adding it later is ~1 day plus URL re-indexing — keep it.

## Anti-bias cross-check

### Devil's advocate

The strongest argument against Layout A is that **it asks a solo developer with 5 weeks of after-hours time to internalize ~12 conventions before writing a single line of business logic**. `create-next-app --typescript --tailwind --app --src-dir` plus Better Auth quickstart plus `shadcn init` would produce a working shell in half a Saturday. Layout A adds: `[locale]` segment routing, three route groups, `_components` private folders, Drizzle split-by-entity (and an `index.ts` barrel and a `relations.ts` file), Supavisor pooled vs direct connection split, Biome (replacing the default ESLint), Lefthook (replacing nothing — adding a hook system), PGlite (replacing nothing — adding a DB-test layer), `requireAuth()` helper convention, and a composed middleware that two libraries have to cooperate inside. Each of these is justifiable individually; together, they are a tax on Day 1 productivity. A solo dev who spends 2 days "setting up the project" instead of 2 days on the `today` view will regret it during week 5.

The second-strongest argument: **the `[locale]` segment is speculation paid in present-day complexity**. The spec calls v2 multi-locale a "may" — not a roadmap commitment. If English never ships, the `[locale]` segment is dead weight in every route file forever. `localePrefix: 'never'` with a cookie achieves identical UX for v1 with strictly less file-system gymnastics. The "migration cost is bounded" argument cuts both ways: if it's bounded, you can afford to defer it.

Third: **split-by-entity Drizzle schema is for 15+ tables, not 7**. The productdevbook guide cited is one opinion; the Drizzle docs themselves show single-file examples up to ~10 tables. A `src/db/schema.ts` with seven `pgTable` exports fits on a screen and a half and never forces the developer to chase relations across files.

### Pre-mortem

It's November 2026. The solo dev returns from a 2-week skiing trip and tries to add a `notes` field to `clients`. The change ripples through six places: `src/db/schema/clients.ts`, `src/db/queries/clients.ts`, `src/lib/validation/client.ts` (drizzle-zod refinement), `_components/client-form.tsx`, the Polish locale message file, and the `actions/clients.ts` Server Action. The `drizzle-kit generate` command works fine, but the Lefthook pre-commit fails: Biome 2.6.0 (auto-updated weeks ago) added a new rule `style/useExplicitTypeForArrowFunctions` that flags 14 files. Half a Saturday gone — not on the feature, on the tooling chain. The signal we ignored: every research subagent flagged Biome's monthly breaking changes; we said "pin the version" in the doc but didn't actually pin in `package.json`.

Second scenario, same date: multi-tenant v2 is being rolled out. The `trainer_id` discipline saved us — every business table has the column — but a Server Component in `(protected)/today/page.tsx` reads `db.query.calendarEvents.findMany({ where: eq(events.starts_at, today) })` directly, bypassing `db/queries/events.ts`. The query has no `trainer_id` filter. Trainer B sees Trainer A's events for 90 seconds before someone catches it. We knew this risk: the doc says "every query takes `trainerId` as first arg" but didn't add a lint rule, type-system guard, or test that enforces the invariant. The "discipline" was advisory, not mechanical.

## Decision

**Adopt Layout A.** All conventions retained as recommended.

Rationale: Layout A's day-1 cost (~2 days of setup vs ~half a day for defaults) is paid back by v2-migration cost avoidance (multi-tenant, multi-lingual, RLS retrofit) that would otherwise consume 1-2 weeks each. The cross-check concerns are real and mitigated explicitly:

1. **Version pin Biome and Lefthook** in `package.json` (not `^`) — re-evaluate quarterly, not auto-updated.
2. **Enforce `trainerId` discipline mechanically**, not advisorily — log as Open Question with three candidate enforcement mechanisms (branded type / lint rule / runtime assertion in `db/queries/*`).
3. **`[locale]` is kept** but logged as a re-evaluation point at the v1.1 retro — if English is killed, drop the segment in one PR.

## Open questions

1. **`trainerId` invariant enforcement.** Three candidates: (a) brand the `trainerId` arg type so the type system forbids passing a raw `string`; (b) custom Biome plugin / ESLint rule flagging `db.query.*.findMany()` calls without a `trainer_id` filter; (c) runtime assertion in every `db/queries/*.ts` function. Need to pick one before multi-tenant v2 rollout. Owner: implementation phase. Resolution by: end of MVP build OR before non-founder trainer onboarding.

2. **Biome version drift.** Pin Biome to a specific version in `package.json` (e.g. `"@biomejs/biome": "1.9.4"`, no `^`). Schedule a quarterly "tooling triage" calendar entry to bump intentionally. Owner: founder. Resolution by: end of week 1 of build.

3. **PGlite vs production Postgres divergence.** PGlite doesn't ship every Postgres extension (e.g. `pgcrypto` is present, but `pg_trgm` is missing as of mid-2026). For tests that touch extensions, fall back to Testcontainers. Document the "if test touches X, use Y" rule. Owner: implementation phase.

4. **Route-folder vs feature-folder reassessment.** Re-evaluate at v1.5 if the route-folder layout starts holding back cross-route components (e.g. an `attendance-row` re-used in both `/today` and `/summary/[month]`). Trigger: third duplication. Owner: implementation phase.

5. **Coolify / Dokploy adoption.** Re-evaluate at v2 when multi-service orchestration (queue worker, cron container, app) makes the GitHub-Actions-SSH workflow brittle. Trigger: first time we want a preview environment for a PR. Owner: founder.

6. **React Email i18n approach for v2 English.** Decide between (a) per-locale template files or (b) `locale` prop + `getTranslations({ locale })`. Defer until English locale ships.

7. **CSP / security headers.** Production deploy on Hetzner needs a sensible CSP (especially for shadcn's inline styles), HSTS, and headers blocked through `next.config.ts` `headers()`. Audit at end of week 4. Owner: implementation phase.

8. **`requireAuth()` helper signature.** Should `requireAuth()` return `{ trainerId, session }` or just `trainerId`? The session payload is useful but pulling everything tempts tight coupling. Resolve at first use site. Owner: implementation phase.
