# Plan — F-02 App Skeleton

> **Roadmap ref:** F-02 in [`docs/roadmap.md`](../../roadmap.md). Unlocks S-01, S-02, S-03, S-04.

## Context

F-02 is the second foundation (after F-01 infrastructure bootstrap). It transforms the bare Next.js scaffold currently in `src/` (just default `layout.tsx`, `page.tsx`, `/api/health/route.ts`) into a working app skeleton with five concerns wired together:

- **Database** — Drizzle ORM with 7-table multi-tenant schema, two Supavisor connections (pooled for app at port 6543 with `prepare: false`, direct for migrations at port 5432)
- **Auth** — Better Auth with Google OAuth (read-only Calendar scope only) + email/password + libsodium-encrypted refresh tokens stored as `(nonce, ciphertext) bytea` columns
- **i18n** — next-intl with `[locale]` segment, single Polish messages catalog (`src/messages/pl.json`), `Europe/Warsaw` timezone forced server-side
- **Routing** — Three route groups (`(marketing)`, `(auth)`, `(protected)`) with `requireAuth()` per-page guard; middleware does optimistic cookie check + locale resolution
- **Sync stub** — `/api/sync` endpoint that pg_cron will hit every 5 min via pg_net; no-op until S-02 (just authenticates the caller + logs)

F-02 is **blocked on F-01** reaching at least T-005 (Supabase project exists, connection URLs in `.env.local`). It does NOT need T-011 (first deploy) — F-02 develops locally against Supabase's connection strings. F-01 must finish before F-02 ships to production, not before F-02 starts.

After F-02 lands, S-01 (Google connect + first sync) is unblocked — all foundations are in place. F-02 itself ships no user-facing feature beyond a Polish marketing landing page and a working auth form — its value is downstream.

## Stack reference (locked by analyses)

| Concern | Choice | Source |
|---|---|---|
| Auth | Better Auth + `@better-auth/next-js`, `encryptOAuthTokens: true`, Google scope `calendar.events.readonly` only | language-and-infrastructure-stack-decision.md:45 |
| Token encryption | `libsodium-wrappers` `crypto_secretbox` (XSalsa20-Poly1305), 32-byte master key from env | language-and-infrastructure-stack-decision.md:82 |
| ORM | Drizzle (`generate`+`migrate` only — never `push` in production) | project-structure-trainer-advisor-decision.md:87 |
| DB driver | `postgres` (postgres-js) with `prepare: false` for Supavisor transaction mode | project-structure-trainer-advisor-decision.md:91 |
| i18n | next-intl, `localePrefix: 'as-needed'`, single locale `pl` in v1 | project-structure-trainer-advisor-decision.md:127 |
| Email sender | Resend (React Email templates deferred — minimal plain-text password reset for now) | language-and-infrastructure-stack-decision.md |
| Validation | Zod (env schema + form parsing) | (convention) |

## Phase A — Packages + env schema

**A1.** Install missing packages in one `pnpm add` call:
- Runtime: `better-auth`, `drizzle-orm`, `postgres`, `libsodium-wrappers`, `next-intl`, `zod`, `resend`
- Dev (`pnpm add -D`): `drizzle-kit`, `@types/libsodium-wrappers`

**A2.** Create `src/env.ts` — Zod schema parsing `process.env`. Fail-fast on missing keys with named error. Export typed `env`. **All other modules import `env`, never `process.env` directly.**

**A3.** Sync `.env.example` (created by F-01) with F-02 vars. Most already exist from F-01 contract (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_*`, `LIBSODIUM_MASTER_KEY`, `RESEND_*`, `SUPABASE_*_URL`). Add `PG_NET_TOKEN` (Phase E1).

## Phase B — Database (Drizzle + Supavisor)

**B1.** Create `drizzle.config.ts` at repo root pointing at `./src/db/schema` and using `DIRECT_URL` (port 5432) for `drizzle-kit migrate`. Output `./drizzle/`.

**B2.** Create `src/db/index.ts` — pooled connection singleton via postgres-js against `env.SUPABASE_DATABASE_URL` (port 6543). **MUST set `prepare: false`** — Supavisor transaction-mode pooling fails silently otherwise with cryptic "prepared statement not found" errors. Export `db` (Drizzle instance with full schema).

**B3.** Create `src/db/schema/` with one file per table. The 9 tables (6 business + 3 Better Auth-managed):

- `trainers.ts` — Better Auth's user table (renamed via Better Auth config: `user` → `trainers`)
- `trainer_google_tokens.ts` — `(trainer_id PK/FK, nonce bytea NOT NULL, ciphertext bytea NOT NULL, expires_at, scope)`
- `clients.ts` — `(id, trainer_id FK NOT NULL, name, email NOT NULL, phone, rate_pln, status)`
- `calendar_events.ts` — `(id, trainer_id NOT NULL, google_event_id, client_id FK nullable, starts_at, ends_at, status, raw jsonb)` + `UNIQUE(trainer_id, google_event_id)`
- `attendance_records.ts` — `(id, trainer_id NOT NULL, calendar_event_id UNIQUE FK, client_id, attended bool, rate_pln_snapshot, marked_at)`
- `app_settings.ts` — `(trainer_id PK/FK, timezone, default_session_minutes, prefs jsonb)`
- `session.ts`, `account.ts`, `verification.ts` — Better Auth tables, names per its Drizzle adapter

Plus `src/db/schema/index.ts` (barrel re-export) and `src/db/schema/relations.ts` (Drizzle relations for joins).

**`trainer_id NOT NULL` on every business table** — non-negotiable per AGENTS.md critical rule. Use a branded TS type `type TrainerId = string & { __brand: 'TrainerId' }` to enforce at compile time that query functions take `trainerId` as first arg (no lint rule or runtime guard in v1 — branded type is sufficient).

**B4.** Run `pnpm drizzle-kit generate` → creates `drizzle/0000_initial.sql`. Inspect for `trainer_id NOT NULL` presence, commit. Run `pnpm drizzle-kit migrate` against Supabase direct URL to apply.

## Phase C — Better Auth + libsodium

**C1.** Create `src/lib/crypto.ts` — thin wrapper around `libsodium-wrappers`. Two functions:
- `encryptToken(plaintext: string): { nonce: Buffer; ciphertext: Buffer }`
- `decryptToken(nonce: Buffer, ciphertext: Buffer): string`

Master key from `env.LIBSODIUM_MASTER_KEY` (32-byte hex → Buffer). Await `sodium.ready` once at module load.

**C2.** Create `src/lib/auth.ts` — Better Auth instance:
- Drizzle adapter pointing at `db` from `src/db/index.ts`
- Email/password enabled with reset-by-email (sends via Resend with minimal plain-text template — React Email deferred)
- Google provider with `scopes: ['https://www.googleapis.com/auth/calendar.events.readonly']` (read-only, no write scope ever) and `encryptOAuthTokens: true`
- Custom encryption callback using `encryptToken` / `decryptToken` from C1 — stores refresh-token `(nonce, ciphertext)` into `trainer_google_tokens` rows
- DB-backed sessions (no `cookieCache` plugin yet — deferred until latency measured)

**C3.** Create `src/app/api/auth/[...all]/route.ts` — Better Auth's catch-all handler. Both `GET` and `POST` export `auth.handler`.

**C4.** Create `src/lib/auth-helpers.ts` — server-side helpers:
- `requireAuth()` — Server Component / Route Handler use. Reads session via Better Auth's server helper. Absent → `redirect('/login')`. Returns `{ trainerId: TrainerId, session }`.
- `getOptionalAuth()` — same but returns `null` instead of redirecting (for marketing pages showing "Sign in" if not authed).

**Decision locked**: `requireAuth()` returns `{ trainerId, session }` object, not just `trainerId`. Future need for session metadata (createdAt, expiresAt) won't change call-site signature.

## Phase D — next-intl + Route groups

**D1.** Create `src/i18n/routing.ts` — `defineRouting({ locales: ['pl'], defaultLocale: 'pl', localePrefix: 'as-needed' })`. Polish URL pathnames (`/dzisiaj` → `/today`) **DEFERRED** — single Polish locale in v1 doesn't need URL translation.

**D2.** Create `src/i18n/request.ts` — `getRequestConfig` returning `{ messages: import('../messages/pl.json'), timeZone: 'Europe/Warsaw' }`. Always-Warsaw is required by NFR.

**D3.** Create `src/messages/pl.json` — seed catalog with namespaces: `Common`, `Marketing`, `Auth`, `Today`. Keys for the scaffold landing page + login/register/reset forms + protected `/today` placeholder. Each future slice extends this file as it ships.

**D4.** Restructure `src/app/`:
- Move `src/app/layout.tsx` → `src/app/[locale]/layout.tsx` (wrap children in `NextIntlClientProvider`, set `<html lang={locale}>`)
- Move `src/app/page.tsx` → `src/app/[locale]/(marketing)/page.tsx`
- Create `src/app/[locale]/(marketing)/layout.tsx` — public layout (header with Sign-in CTA, no auth check)
- Create `src/app/[locale]/(auth)/{login,register,reset-password}/page.tsx` — form skeletons using Better Auth client
- Create `src/app/[locale]/(auth)/layout.tsx` — centered card layout, no auth check
- Create `src/app/[locale]/(protected)/layout.tsx` — calls `requireAuth()` server-side **per page**, per AGENTS.md rule
- Create `src/app/[locale]/(protected)/today/page.tsx` — placeholder "Connect Google to populate" (real S-01 work)

**D5.** Create `src/middleware.ts`:
- Compose next-intl's `createMiddleware(routing)` with Better Auth's `getSessionCookie` optimistic check
- Match all routes except `/api/*`, `/_next/*`, `/favicon.ico`, static assets
- For `[locale]/(protected)/*` paths: if no session cookie → 302 to `/login`. **Optimistic only** — real auth happens in `requireAuth()` per AGENTS.md ("middleware-only is NOT SECURE per Better Auth docs").

**D6.** Update `next.config.ts` — wire next-intl plugin: `withNextIntl('./src/i18n/request.ts')`.

## Phase E — Sync stub + smoke test

**E1.** Create `src/app/api/sync/route.ts` — POST handler. Reads `Authorization: Bearer <PG_NET_TOKEN>` header to verify caller is Supabase pg_net (not random internet). For F-02: log "sync invoked at <timestamp>", return `200 { status: 'ok', synced: 0 }`. Real implementation lands in S-02.

**E2.** SQL for pg_cron job (to apply against Supabase via SQL editor after first deploy, NOT a Drizzle migration):

```sql
SELECT cron.schedule(
  'trainer-advisor-sync',
  '*/5 * * * *',
  $$ SELECT net.http_post(
       url := 'https://<domain>/api/sync',
       headers := jsonb_build_object('Authorization', 'Bearer <PG_NET_TOKEN>')
     ) $$
);
```

Place this in `drizzle/manual/0001_pg_cron_sync.sql` (separate folder from auto-generated migrations — won't be run by `drizzle-kit migrate`). Apply manually post-deploy.

**E3.** Smoke test (see Verification below — 10 points).

## Files to CREATE

Pattern: app skeleton wires 5 concerns into `src/`. Representative paths:

- `src/env.ts` — Zod env schema
- `drizzle.config.ts` — Drizzle Kit config (repo root)
- `src/db/index.ts` — pooled DB client
- `src/db/schema/{trainers,trainer_google_tokens,clients,calendar_events,attendance_records,app_settings,session,account,verification}.ts` — 9 schema files
- `src/db/schema/{index,relations}.ts` — barrel + relations
- `src/lib/{crypto,auth,auth-helpers}.ts` — auth + token-encryption helpers
- `src/app/api/auth/[...all]/route.ts` — Better Auth handler
- `src/app/api/sync/route.ts` — pg_cron sync stub
- `src/i18n/{routing,request}.ts` — next-intl config
- `src/messages/pl.json` — Polish strings
- `src/middleware.ts` — composed next-intl + auth cookie check
- `src/app/[locale]/(marketing)/{layout,page}.tsx`
- `src/app/[locale]/(auth)/{layout.tsx, login/page.tsx, register/page.tsx, reset-password/page.tsx}`
- `src/app/[locale]/(protected)/{layout.tsx, today/page.tsx}`
- `drizzle/0000_initial.sql` — generated migration (Phase B4 output)
- `drizzle/manual/0001_pg_cron_sync.sql` — pg_cron schedule (manual apply)

## Files to EDIT

- `package.json` — added dependencies (Phase A1) + new scripts: `db:generate`, `db:migrate`, `db:studio`
- `.env.example` — confirm F-02 vars + add `PG_NET_TOKEN`
- `next.config.ts` — wire next-intl plugin
- `src/app/layout.tsx` → moved (see D4)
- `src/app/page.tsx` → moved (see D4)

## Decisions locked in this plan

- **`requireAuth()` returns `{ trainerId, session }`** (object, not bare trainerId) — future-proof against needing session metadata at call sites.
- **`trainer_id` enforcement via branded TS type only** — `type TrainerId = string & { __brand: 'TrainerId' }`. No ESLint custom rule, no runtime guard in v1. Compile-time enforcement is sufficient when query layer is the only place producing/consuming `TrainerId`.
- **Polish URL pathnames deferred** — single-locale Polish v1 doesn't need `/dzisiaj` mapping. Defer until/unless English locale added in v2.
- **`cookieCache` Better Auth plugin deferred** — skip until session-check latency is actually measured to be a problem.
- **React Email templates deferred** — Better Auth password reset uses Resend with a minimal plain-text inline template. Pretty React Email templates are S-01 polish, not F-02.
- **Sentry deferred** — per roadmap, until first non-founder user.
- **PWA / Serwist deferred** — `src/app/manifest.ts` + icons may land later as small follow-up; not in F-02 scope.

## Decisions to make BEFORE execution

- **`PG_NET_TOKEN` value generation** — 32-byte random hex. Generate with `openssl rand -hex 32`, store in `.env.local` + GitHub Actions secret (post-F-01 deploy). Add to .env.example placeholder before Phase E1.
- **Better Auth's email-password reset template wording (Polish)** — short plain text: "Cześć, kliknij ten link aby zresetować hasło: <url>". Phrasing locked here in Phase C2 — full Polish copy lives in `src/messages/pl.json` under `Auth.passwordResetEmail`.
- **Drizzle schema primary-key strategy** — `uuid v7` (time-ordered) via `pg.gen_random_uuid()` or `cuid2`? Both fine. **Recommendation: `uuid v7`** via the `uuid_generate_v7()` Postgres extension if available, else `pg.gen_random_uuid()` (uuid v4) as fallback. Decide before B3.

## Open questions (parking lot — defer to S-NN)

- **Recurring event handling (FR-010)** — `calendar_events.raw jsonb` carries Google's raw event; does `google_event_id` need to be the master event ID or per-instance ID for recurring series? Affects unique constraint and edit semantics. Defer to S-01.
- **`trainer_google_tokens` row lifecycle on disconnect (FR-003)** — disconnect preserves attendance but stops sync. Does the token row get deleted, zeroed-out, or marked `revoked_at`? Defer to S-01.
- **Manual "sync now" pull-to-refresh** — Open Roadmap Question 4. Affects whether `/api/sync` needs an unauthenticated trigger path or a separate authenticated user-trigger endpoint. Defer to S-01.

## Verification

End-to-end smoke test after F-02 is implemented. All 10 must pass before flipping F-02 status to `done` in `docs/roadmap.md`:

1. **Packages installed:** `pnpm ls better-auth drizzle-orm postgres next-intl libsodium-wrappers zod resend` returns all with versions, no `(missing)`.
2. **Env schema fails fast:** `pnpm dev` with a missing env var (e.g., delete `BETTER_AUTH_SECRET` from `.env.local`) crashes before serving any request with a Zod error naming the missing key.
3. **DB migration applied:** `psql $SUPABASE_DIRECT_URL -c "\dt"` shows all 9 tables. `\d clients` shows `trainer_id` is `NOT NULL`. `\d trainer_google_tokens` shows `nonce bytea NOT NULL`, `ciphertext bytea NOT NULL`.
4. **Supavisor pooled connection works:** `pnpm dev`, hit `/api/health` → 200 (proves no prepared-statement errors). If `prepare: false` is missing from `src/db/index.ts`, this fails on first DB query with a Supavisor error.
5. **Sign-up via email/password:** Visit `/login`, click "Register", enter email + password, submit → row appears in `trainers` (or whatever Better Auth's primary user table is named). Reset-password email arrives via Resend (use a real email; check inbox).
6. **Sign-in + protected redirect:** Sign out. Visit `/today` → middleware redirects to `/login`. Sign in → `/today` renders Polish placeholder text.
7. **Google OAuth opens consent screen:** On `/today` placeholder, click "Connect Google" → browser opens Google's consent screen showing only the `calendar.events.readonly` scope. (Don't complete the consent — just verify scope is read-only.)
8. **Token encryption:** Complete a Google OAuth flow with a test account. Inspect a `trainer_google_tokens` row in Supabase Studio — `nonce` and `ciphertext` are non-empty bytea; the plaintext token does NOT appear anywhere in the row, logs, or analytics.
9. **i18n loads Polish:** Visit `/` → page heading and visible strings are Polish (from pl.json). No raw `Common.title` placeholder leaks to UI.
10. **Sync stub responds correctly:** `curl -X POST -H "Authorization: Bearer $PG_NET_TOKEN" http://localhost:3000/api/sync` → 200 OK with `{ status: 'ok', synced: 0 }`. Without the token, or with wrong token → 401.

If all 10 pass: F-02 status → `done` in `docs/roadmap.md`. S-01 unblocked. STATUS.md auto-regenerates on the F-02 initiative's last task commit.

## Out of scope for this plan

- Real Google Calendar sync logic (S-01)
- Daily view UI with attendance toggles (S-02)
- Monthly summary aggregation + Polish copy text (S-03)
- Client list / edit UI (S-04)
- Polish URL pathnames mapping (`/dzisiaj`) — deferred until v2 if English added
- Service worker / Serwist / offline support (v2)
- Postgres RLS (v2)
- Sentry / advanced observability (deferred per roadmap)
- React Email templates beyond minimal password-reset (S-01+)
- Pretty marketing landing page copy (post-MVP polish)
- 2FA on app account (Open Q #7 in stack decision)
