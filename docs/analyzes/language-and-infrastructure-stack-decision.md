---
title: Language and infrastructure stack for Trainer Advisor MVP
date: 2026-05-22
type: decision
status: decided
decision: "Next.js 15 (App Router) + TypeScript + Better Auth + Supabase Postgres (Frankfurt) + Hetzner CX22 VPS app hosting; libsodium for OAuth refresh-token encryption; polling sync every 5 min via Supabase pg_cron."
related:
  - docs/product-spec.md
---

# Language and infrastructure stack for Trainer Advisor MVP

## Context

Trainer Advisor is a greenfield single-tenant web app described in `docs/product-spec.md`. The product profile is unusually constrained on every axis that matters for stack selection:

- **One paying-only-by-time user** (the founder-trainer) for v1, ~20 clients, ~150 calendar events/month — three orders of magnitude below any "scaling concern".
- **Five-week MVP after-hours**, solo developer — framework leverage and ecosystem maturity outweigh runtime purity.
- **Mobile-first PWA in Polish** with a hard NFR of ≤1 second tap-to-confirm UI feedback on a mid-range phone over 4G.
- **EU data residency** (RODO/GDPR) is non-negotiable; Polish-trainer audit comfort favors a German/Polish-friendly host over US-headquartered serverless platforms.
- **Google Calendar read-only OAuth** with encrypted refresh-token storage and ~5-minute sync staleness budget.
- **Multi-tenant future is allowed** but not implemented — design choices must not foreclose `trainer_id` partitioning later.

The decision needs to be made BEFORE implementation work begins. The cost of guessing wrong now is rewriting the auth layer or migrating the host mid-build during a 5-week window — both lethal to the timeline.

## Question

Given the constraints above, which combination of (a) programming language + web framework, (b) authentication library, (c) database hosting, (d) app hosting, and (e) background-job mechanism gives a solo developer the fastest, most maintainable path to a working v1 — without foreclosing a multi-tenant v2 or violating RODO?

## Findings

### Frontend + full-stack framework

Four candidates evaluated against solo-dev MVP velocity, PWA ergonomics, Polish i18n, OAuth integrations, and EU hosting flexibility:

- **Next.js 15+ (App Router) — `[fit: strong]`.** Largest starter ecosystem, RSC + Server Actions kill most CRUD boilerplate, `next-intl` is App-Router-native and handles `pl-PL` + Europe/Warsaw via `Intl.DateTimeFormat` / `Intl.NumberFormat`. Tailwind + `shadcn/ui` is the de facto component stack with deepest 2026 community coverage. PWA via `serwist`. Known sharp edge: App Router caching has caused surprises in multi-tenant deployments — see [Self-Hosting Next.js](https://nextjs.org/docs/app/guides/self-hosting) and [Next.js 15 self-hosted caching](https://dev.to/technnik/nextjs-15-app-router-caching-why-self-hosted-apps-need-redis-and-how-to-implement-it-23op). Irrelevant for single-instance v1; flagged for multi-tenant migration.
- **SvelteKit — `[fit: strong]`.** Smaller bundles (50–70% less JS than React stacks), Paraglide JS i18n is excellent, best multi-adapter hosting story. Strong on the ≤1s tap NFR. Loses on starter-kit density and Polish-market hireability: [SvelteKit vs Next.js 2026](https://www.devmorph.dev/blogs/sveltekit-vs-nextjs-16-performance-benchmarks-2026).
- **React Router 7 (ex-Remix) — `[fit: OK]`.** Clean loader/action model, but ecosystem is rebuilding mindshare after the [Remix → React Router rebrand](https://remix.run/blog/merging-remix-and-react-router). Smaller starter-kit pool than Next.
- **Rails 8 — `[fit: strong if you know Ruby]`.** Solid Queue (Postgres-backed jobs, no Redis), [built-in auth generator](https://blog.saeloun.com/2025/05/12/rails-8-adds-built-in-authentication-generator/), native PWA generator, single-box deploy via Kamal. Genuine "one-person framework" pitch. Disqualified here only because TypeScript is preferred and the user has stronger JS/TS background.

> Ref: docs/product-spec.md — "A trainer's tap on a daily-view event to cycle attendance state … produces visible UI confirmation in ≤ 1 second on a mid-range phone over a 4G connection." This NFR puts SvelteKit's bundle-size advantage on the table; mitigated for Next.js by aggressive code-splitting + RSC.

### Authentication library (TypeScript/Node ecosystem)

- **Better Auth — `[fit: strong]`.** Native Google OAuth with [`encryptOAuthTokens`](https://better-auth.com/docs/concepts/oauth) flag encrypting refresh tokens at rest. Built-in email-password + reset-by-email flow. Self-hostable. Free OSS. The Auth.js team [pointed new projects at Better Auth in September 2025](https://github.com/nextauthjs/next-auth/discussions/13252).
- **Auth.js v5 (NextAuth) — `[fit: OK]`.** Mature but in security-patch-only mode. Refresh-token rotation is DIY in callbacks ([guide](https://authjs.dev/guides/refresh-token-rotation)). Not the recommended pick for a new 2026 project.
- **Lucia v3 — `[fit: dead]`.** [Deprecated March 2025](https://www.wisp.blog/blog/lucia-auth-is-dead-whats-next-for-auth), now learning resource only. Out.
- **Clerk — `[fit: weak]`.** Fastest DX, free up to 50k MAU, Pro $99/mo. US-based: data-residency friction for a RODO audit. Out.
- **Supabase Auth — `[fit: OK]`.** Free, mature, paired naturally with Supabase Postgres. Caveat: Supabase itself does not store OAuth provider refresh tokens by default — you'd need to opt in via Vault.

### Database hosting (EU region, free tier, RODO posture)

- **Supabase (Frankfurt `eu-central-1`) — `[fit: strong]`.** Free tier: 500 MB database, 5 GB egress, encryption at rest by default, `pg_cron` extension available. Pauses after 7 days inactivity (workaround: scheduled ping). No Free-tier backups → script a nightly `pg_dump` to Cloudflare R2 (free 10 GB). US-incorporated; RODO-residency compliant, sovereignty caveat noted. [Supabase pricing](https://supabase.com/pricing), [available regions](https://supabase.com/docs/guides/platform/regions).
- **Neon (Frankfurt) — `[fit: OK]`.** Better free tier (100 CU-hr/mo doubled October 2025), but scale-to-zero cold start (~300–800ms) directly attacks the ≤1s tap NFR. US-HQ CLOUD Act exposure. [Neon alternatives in Europe](https://danubedata.ro/blog/neon-alternatives-europe-serverless-postgres-2026).
- **Hetzner Cloud self-managed PG — `[fit: strong on sovereignty]`.** CX22 €4.49/mo post-April-2026 ([price adjustment notice](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)). German company, full GDPR sovereignty. Solo-dev tax: ~half a Saturday for setup; ongoing patching. Co-located with app on same VPS.
- **Railway / Render — `[fit: weak]`.** Free tiers cut materially in 2025–2026; Railway no longer free, Render free Postgres expires after 30 days with no backups. Out.
- **Fly.io Managed PG — `[fit: weak]`.** Basic plan $38/mo + inter-region egress charges starting Feb 2026. Overpriced.

### App hosting

- **Hetzner CX22 VPS (Falkenstein/Helsinki) — `[fit: strong]`.** €4.49/mo single box runs Node + cron + (optional) Postgres. Maximum sovereignty, minimum cost. No commercial-use restrictions (unlike Vercel Hobby). Operational tax = solo dev patches it.
- **Vercel Hobby — `[fit: weak]`.** Frankfurt edge, great DX, but [prohibits commercial use](https://vercel.com/docs/plans/hobby) and crons are **daily-only**. Two hard blockers given multi-tenant v2 intent.
- **Vercel Pro — `[fit: OK]`.** $20/mo, unlocks commercial + every-N-minutes cron, but 4× the Hetzner cost for similar functionality.
- **Cloudflare Workers + Pages — `[fit: weak for Next.js, strong for SvelteKit]`.** Warsaw POP, true free tier, no cold start, native cron. Next.js on Workers via OpenNext has rough edges that bite during a 5-week MVP. Strong runner-up IF the framework choice flips to SvelteKit later.

### Background-job mechanism (5-min sync cadence = 8,640 invocations/month)

- **Supabase `pg_cron` + `pg_net`** — runs inside the Postgres instance, free on all tiers, ideal when the DB is already Supabase. Calls a Next.js route handler `/api/sync` every 5 min. Doubles as the keepalive ping for the 7-day-inactivity pause.
- **`node-cron`** in-process on the Hetzner box — also free, trivial, no external dependency. Used if Supabase is swapped for Hetzner-managed Postgres.
- **Vercel Hobby cron** — daily-only. Out.
- **Cloudflare Workers Cron Triggers** — free, 1-min minimum interval. Used only if app hosting flips to Workers.

### Google Calendar API integration

- **Sync strategy: polling beats push** for a 5-min staleness budget. Google's own docs warn `events.watch` is not 100% reliable. Push notifications add: public HTTPS endpoint, channel renewal every 7 days, missed-notification handling — none of it buys anything against a 5-min SLA. Use `events.list` + `syncToken` (HTTP 410 → full resync). [Google's incremental sync guide](https://developers.google.com/calendar/api/guides/sync), [push notifications guide](https://developers.google.com/calendar/api/guides/push).
- **Quota verdict: trivially free at v1.** ~290 req/day vs 1M/day project cap. 100 trainers ≈ 3% of cap. [Calendar API quota](https://developers.google.com/calendar/api/guides/quota).
- **Recurring events: always `singleEvents=true`.** Google expands the series; each instance has its own stable `id`. Attendance keys cleanly on instance `id`. [Recurring events guide](https://developers.google.com/calendar/api/guides/recurringevents).
- **Stable identity:** simple time-shift preserves `id`; recurring instance moves preserve `id` and use `originalStartTime` as the tiebreaker. Attendance follows the event automatically when keyed on `id`.

### OAuth refresh-token encryption pattern

- **libsodium `crypto_secretbox`** (Node: `libsodium-wrappers`) — authenticated encryption (XSalsa20-Poly1305), 32-byte master key from env var, store `(nonce, ciphertext)` columns in Postgres. Key never touches SQL.
- **pgcrypto `pgp_sym_encrypt`** — works but passphrase ends up in SQL query text (`pg_stat_statements`, logs). Rejected.
- **AWS/GCP KMS** — overkill at 1 trainer; adds vendor dependency and latency for a single secret. Revisit at ~100 tenants.
- **Supabase Vault / pgsodium** — viable but adds vendor lock-in. Equivalent security at this scale to env-var-held master key.

> Ref: docs/product-spec.md — Guardrails section: "Authorization-token handling. The Google authorization refresh token is stored encrypted at rest and never exposed in logs, error messages, or analytics." libsodium pattern satisfies this directly.

## Alternatives considered

- **Stack A — Next.js 15 + Better Auth + Supabase + Hetzner VPS app hosting (CHOSEN).**
  - Pros: largest starter ecosystem, RSC velocity, Polish i18n via `next-intl`, EU residency, OAuth + email-password in one library with token encryption, sub-€5/month cost, no commercial-use restriction, full DB sovereignty for v1 data.
  - Cons: App Router caching has multi-tenant surprises; VPS patching is on the solo dev; Next 16+ upgrades may force migration work during MVP window.
  - Verdict: best fit. Mitigations for caching (force-dynamic on user-scoped routes) and patching (unattended-upgrades + UptimeRobot) are cheap.

- **Stack B — SvelteKit + Better Auth + Supabase + Cloudflare Workers.**
  - Pros: 50–70% smaller bundles directly serve the ≤1s NFR; Warsaw POP latency; no Next.js caching surprises; Paraglide JS i18n; framework-agnostic Better Auth still works.
  - Cons: smaller starter-kit pool, smaller Polish hireability pool, smaller AI-assist coverage; Cloudflare Workers Node-compat still has edges in 2026.
  - Verdict: strong runner-up. Pick this if you already know Svelte or want to spike a weekend prototype.

- **Stack C — Rails 8 + Solid Queue + Hetzner CX22 single box.**
  - Pros: built-in auth generator + Solid Queue + Hotwire = "one-person framework"; lowest infrastructure surface (one VPS, one Postgres, one process); Kamal deploy is single-command.
  - Cons: Ruby learning curve if not already known; smaller TypeScript-PWA ergonomics; harder AI-assist coverage on Rails 8's new features.
  - Verdict: would beat the chosen stack if Ruby were already in the user's hands. Out of scope as a learning project on top of a 5-week MVP.

- **Stack D — Cloudflare Pages SPA + Supabase Edge Functions + Supabase Auth.**
  - Pros: no backend code at all; multi-tenant ready via Row-Level Security; everything in one vendor; cheap.
  - Cons: Supabase Edge Functions lack the polish of Next.js route handlers for OAuth flows; Supabase Auth doesn't store provider refresh tokens by default; SPA-only loses SSR for SEO if the product ever wants discovery (irrelevant in v1, possibly relevant for v2 secondary persona).
  - Verdict: viable v2 simplification, premature for v1.

## Anti-bias cross-check

### Devil's advocate

The strongest argument against Stack A is that **Next.js App Router's caching model is a known multi-tenant footgun and the solo dev is signing up to debug it the moment the product goes multi-trainer**. Several real-world reports (linked above) describe data bleeding between users via incorrectly-keyed RSC caches and `fetch` cache layers. Next 16 is already in flight, meaning a 5-week MVP started today will likely cross at least one minor-version upgrade with breaking-change risk. SvelteKit avoids this entirely: it has no global cache, loaders are explicit, and `+page.server.ts` is conceptually simpler than Server Components + Route Handlers + Server Actions + middleware. The bundle-size advantage (50-70% smaller JS) directly serves the most product-fatal NFR in the spec — ≤1s tap-to-confirm on 4G. The starter-kit argument is weak: solo-dev MVPs are not won by copying a starter, they are won by NOT debugging the framework. SvelteKit gives the dev more time on Trainer Advisor's actual problems and less time on Next.js's accidental complexity.

Equally: **Rails 8 would let a Ruby-fluent solo dev ship this in 3 weeks, not 5.** Built-in auth generator + Solid Queue means OAuth + cron + email-password + reset is one `rails generate` away, not "wire up Better Auth + node-cron + Resend + email templates". The Postgres-backed queue eliminates Supabase pg_cron entirely. Kamal deploys the whole thing to a single Hetzner box in 30 seconds. The TypeScript-PWA narrative is overrated — Hotwire turns server-rendered HTML into PWA-grade interactivity for far less code.

### Pre-mortem

It's November 2026. Trainer A loved the app, told three trainer friends, all want accounts. We flip multi-tenant on. Within 48 hours of multi-tenant deploy, trainer B opens the daily view and briefly sees trainer A's clients in the list — for ~30 seconds, until a redeploy clears the RSC cache. A Slack message to the founder includes a screenshot. We trace it to a Next.js App Router fetch-cache that was keyed on `params.date` but not on the authenticated user — we'd written `force-dynamic` on the page but not on a nested data fetcher. We knew this risk existed: the research subagent flagged it; we filed it as "v1 is single-tenant, mitigate later". The signal we should have seen: every public Next.js multi-tenant post-mortem on HN from 2024-2025 named this exact failure mode.

Second scenario, same date: the Hetzner CX22 has been running since June 2026 without patches. A CVE in OpenSSH lands, the VPS gets fingerprinted in a mass scan, the attacker can't get further than a locked SSH port but the noise of the attempted intrusion has eaten the box's CPU budget. The app goes unresponsive for 4 hours during a Saturday evening (peak attendance-marking window). The trainer didn't get an alert because we never set up UptimeRobot. We knew the risk: solo-dev VPS patching is a Day-1 task. We skipped it because "MVP".

## Decision

**Adopt Stack A: Next.js 15 (App Router) + TypeScript + Better Auth + Supabase Postgres (Frankfurt, Free tier) + Hetzner CX22 VPS for app hosting + libsodium `crypto_secretbox` for OAuth refresh-token encryption + Supabase `pg_cron` calling a Next.js `/api/sync` route every 5 minutes + `events.list` polling with `syncToken` and `singleEvents=true`.**

Rationale: best fit for a solo-dev 5-week MVP with the user's existing TypeScript leverage; satisfies every hard constraint (EU residency, RODO posture, encrypted token storage, ≤1s tap NFR via aggressive RSC code-splitting, ≤5min staleness via 5-min `pg_cron`, multi-tenant non-foreclosure via Postgres `trainer_id` column from day one); total monthly cost <€10. The two cross-check concerns (caching surprises in multi-tenant; VPS patching) are filed as Open Questions with cheap mitigations to implement before any non-founder onboards.

## Open questions

1. **Multi-tenant data isolation with Next.js App Router caching.** Mitigation plan: every route handler and Server Component that reads trainer-scoped data must use `dynamic = 'force-dynamic'` + explicit auth check at the top of the function. No global fetch cache for user-scoped reads. Owner: implementation phase. Resolution by: before any non-founder trainer is invited.

2. **VPS operational baseline.** Day-1 setup must include: `unattended-upgrades`, UFW firewall (ports 22/443 only, 22 IP-allowlisted), Fail2ban, UptimeRobot (free tier) pinging `/api/health`, automated nightly `pg_dump` to Cloudflare R2 (encrypted). Owner: implementation phase. Resolution by: before MVP launch.

3. **Backup verification.** Nightly `pg_dump` to R2 is necessary but not sufficient — un-tested backups are not backups. Schedule monthly restore-test into a scratch Postgres. Owner: implementation phase. Resolution by: end of month 2 post-launch.

4. **Supabase 7-day-inactivity pause keepalive.** During MVP, the founder is the user, so traffic should keep the project warm. Schedule a defensive: cron-triggered `SELECT 1` from Cloudflare R2 cron script, OR a GitHub Actions workflow that pings the app every 5 days. Owner: implementation phase.

5. **Email sender for password-reset flow.** Better Auth's email-password reset needs an email-send mechanism. Candidates: Resend (free 100 emails/day, EU region available), Brevo (EU), Postmark. Decision deferred. Owner: tech-stack-selection-followup.

6. **Domain + TLS.** Polish `.app` or `.pl` domain via OVH or Cloudflare Registrar; Caddy on Hetzner auto-issues Let's Encrypt cert. Cost ~12 PLN/year. Decision deferred. Owner: tech-stack-selection-followup.

7. **2FA on the app account.** Spec leaves password-strength rules and 2FA "open for downstream decision". Better Auth supports TOTP out of the box; v1 commitment TBD. Owner: founder.

8. **Monitoring beyond UptimeRobot.** Sentry free tier (5k errors/month, EU region) for error tracking? Or defer entirely. Owner: implementation phase.
