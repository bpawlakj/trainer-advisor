# Trainer Advisor — Agent Rules

Trainer Advisor is a Polish-language mobile-first PWA layered on top of Google Calendar: read calendar events, mark per-session attendance, aggregate into a monthly revenue summary. Single-tenant v1, multi-tenant v2. This file captures the local conventions the agent cannot infer from the codebase or its auto-active language rules.

Out of scope here: TypeScript / React / Node / security idioms — those live in `~/.claude/rules/*.md` and auto-activate on file edit. See [References](#references).

## Critical (highest priority)

### Multi-tenant from day one

Every business table has a `trainer_id NOT NULL` column from the first migration, even though v1 has exactly one trainer. Retrofitting tenancy onto an existing single-tenant schema costs 4–8 weeks plus a security review; designing it in costs 2–4 days.

Every database query function takes `trainerId` as its **first argument** and filters on it. No `db.query.*.findMany()` or raw SQL without an explicit `trainer_id` filter — Better Auth does not issue Postgres JWTs, so Supabase RLS is not the safety net (yet). The discipline is mechanical: `listClients(trainerId)`, `getClient(trainerId, id)`, `markAttendance(trainerId, eventId, attended)`. Add the filter even when "we are single-tenant now" — that is exactly when the future bug gets planted.

> Source: `docs/analyzes/project-structure-trainer-advisor-decision.md` § Database layer + § Authorization.

### Google OAuth is read-only and the refresh token is encrypted

The OAuth grant requested is **read-only on Google Calendar events**. The app never creates, updates, or deletes calendar events. If a code path needs a write scope, stop and ask — adding scope is a product decision, not an implementation detail.

OAuth refresh tokens are stored in `trainer_google_tokens` as `(nonce BYTEA, ciphertext BYTEA)` encrypted with libsodium. Never persist a raw refresh token. The encryption key is read from an environment variable, never committed.

> Source: `docs/product-spec.md` § Access Control; `docs/analyzes/project-structure-trainer-advisor-decision.md` § Database layer.

### Attendance is binary; revenue uses snapshot rate; attendance follows the event

Attendance has exactly two values: **came** / **didn't come**. Do not introduce a `cancellation_reason`, `O1`/`O2`, or "excused" enum — the Polish cancellation classification is out of scope by explicit non-goal.

Revenue calculations use `attendance_records.rate_pln_snapshot` (captured at the moment "came" was marked), never the current `clients.rate_pln`. Raising a client's rate forward does not retroactively rewrite past months.

When a Google Calendar event moves (different date / time), the attendance decision follows the event — do not invalidate or re-prompt. When the event is deleted in Google Calendar, the attendance record is **preserved** and surfaced as orphaned (FR-010), not cascade-deleted.

> Source: `docs/product-spec.md` § Business Logic + FR-014 + FR-010.

## Conventions (project-specific)

### Folder names in English, UI strings in Polish

Folder and route names stay in English (`today`, `clients`, `summary/[month]`, `login`, `register`, `reset-password`). User-facing strings are Polish and live in `src/messages/pl.json` — never hardcode Polish inside JSX. The whole app is wrapped in a `[locale]` segment via next-intl (`localePrefix: 'as-needed'`).

If Polish URLs are needed for SEO or aesthetics, use next-intl's `pathnames` mapping (`/today → /dzisiaj`) — the file structure stays English even then.

> Source: `docs/analyzes/project-structure-trainer-advisor-decision.md` § Route organization + § i18n.

### Money and dates are locale-aware, server-side

Polish currency formatting uses `Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })` which yields `1 200,50 zł` (non-breaking space + comma). Never build money strings with `toFixed()` + concat — that breaks Polish formatting and produces wrong-looking output.

Server-side date formatting must explicitly pass `timeZone: 'Europe/Warsaw'`. next-intl has no global `timeZone` setting — it's per-call, or set via `getRequestConfig` in `src/i18n/request.ts`. UTC-default formatting silently makes "today" wrong around midnight.

> Source: `docs/analyzes/project-structure-trainer-advisor-decision.md` § i18n.

### Drizzle: `generate` + `migrate`, never `push` in production

Schema changes go through `drizzle-kit generate` (writes a migration file) followed by `drizzle-kit migrate` (applies it). `drizzle-kit push` is reserved for local-only shape-iteration; in production it silently drops data (Zenn post-mortem cited in research). Migrations live in `drizzle/` at repo root.

### Supavisor pooled connection requires `prepare: false`

`src/db/index.ts` uses postgres-js against Supabase Supavisor on port 6543 (transaction-mode pooler) and must set `prepare: false` — prepared statements through the pooler fail in non-obvious ways. The direct connection (port 5432, `DIRECT_URL` env var) is reserved for `drizzle-kit migrate` only.

> Source: `docs/analyzes/project-structure-trainer-advisor-decision.md` § Migrations + § Connection.

### `requireAuth()` runs per-page, not in middleware alone

`src/middleware.ts` does an optimistic session-cookie presence check via `getSessionCookie` to redirect unauthenticated traffic away from `(protected)/*`. The **real** auth check happens in `(protected)/layout.tsx` via `requireAuth()` from `src/lib/auth-helpers.ts`. Better Auth's docs explicitly mark middleware-only validation as "NOT SECURE" — do not rely on it.

> Source: `docs/analyzes/project-structure-trainer-advisor-decision.md` § Auth integration.

## Workflow

- Branch naming and commit messages follow ai-devkit `/implement` skill defaults — `<initiative-slug>/<task-id>` branches, one commit per atomic T-NNN task, frontmatter writeback after commit. Do not hand-edit `T-*.md` `status:` / `commit:` — the skill writes those.
- Planning artifacts live under `docs/work/<NNN>-<slug>/` (plan.md + T-*.md + index.md).
- Research artifacts under `docs/analyzes/<slug>.md` are point-in-time snapshots — never edit retroactively; write a follow-up doc instead.
- Lessons learned live append-only at `docs/reference/lessons.md`. When the agent makes the same mistake twice, capture it there with context, problem, rule, applies-to.
- Tooling versions for Biome and Lefthook are **pinned** in `package.json` (no `^` ranges). Quarterly intentional bumps — auto-updates have broken builds before (project pre-mortem).
- Permission policy is in `.claude/settings.json`. Machine-specific overrides go in `.claude/settings.local.json` (gitignored).

## References

- **Build / test / lint commands**: see `package.json` scripts.
- **Product decisions** (vision, persona, business logic, access control, non-goals): `docs/product-spec.md`.
- **Architecture & stack rationale**: `docs/analyzes/language-and-infrastructure-stack-decision.md`, `docs/analyzes/project-structure-trainer-advisor-decision.md`, future entries in `docs/architecture/`.
- **Lessons learned** (incident-derived rules): `docs/reference/lessons.md` (append-only).
- **Bootstrap verification report**: `docs/work/000-bootstrap/verification.md`.
- **Permission policy**: `.claude/settings.json` (committed, team policy); `.claude/settings.local.json` (per-machine, gitignored).

## Out of scope for this file

Language conventions (TypeScript `unknown` over `any`, React hooks / accessibility / key stability, Node REST design / N+1 prevention / structured logging, security / OWASP / STRIDE) live in `~/.claude/rules/*.md` and auto-activate on file edit. Do not re-state them here — they cost context for no benefit (research: redundant `AGENTS.md` content adds 20–23% to agent cost without improving outcomes).
