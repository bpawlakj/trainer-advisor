---
id: T-003
title: Drizzle schema — 9 table files + barrel + relations
status: done
plan: ../plan.md
created: 2026-05-27
completed: 2026-05-28
commit: null
depends_on: [T-002]
blocks: [T-004, T-006]
plan_anchor: B3
---

## Scope

Create `src/db/schema/` with one file per table — 6 business tables + 3 Better Auth-managed tables — plus `index.ts` (barrel re-export) and `relations.ts` (Drizzle relations for joins). Every business table has `trainer_id NOT NULL` from day one per AGENTS.md.

## Approach

Files to create under `src/db/schema/`:

| File | Purpose | Key columns |
|---|---|---|
| `trainers.ts` | Better Auth user table (renamed) | `id (uuid pk)`, `email unique`, `name`, `email_verified bool`, `image`, `created_at`, `updated_at` |
| `trainer_google_tokens.ts` | Encrypted refresh tokens | `trainer_id pk/fk → trainers.id`, `nonce bytea NOT NULL`, `ciphertext bytea NOT NULL`, `expires_at`, `scope` |
| `clients.ts` | Trainer's clients | `id uuid pk`, `trainer_id FK NOT NULL`, `name`, `email NOT NULL`, `phone`, `rate_pln numeric(10,2)`, `status` |
| `calendar_events.ts` | Synced GCal events | `id uuid pk`, `trainer_id NOT NULL`, `google_event_id`, `client_id FK nullable`, `starts_at`, `ends_at`, `status`, `raw jsonb`, `UNIQUE(trainer_id, google_event_id)` |
| `attendance_records.ts` | Per-event mark | `id uuid pk`, `trainer_id NOT NULL`, `calendar_event_id UNIQUE FK`, `client_id`, `attended bool`, `rate_pln_snapshot numeric(10,2)`, `marked_at` |
| `app_settings.ts` | Per-trainer prefs | `trainer_id pk/fk`, `timezone default 'Europe/Warsaw'`, `default_session_minutes`, `prefs jsonb` |
| `session.ts` | Better Auth | per Better Auth Drizzle adapter |
| `account.ts` | Better Auth | per Better Auth Drizzle adapter |
| `verification.ts` | Better Auth | per Better Auth Drizzle adapter |

Plus:
- `src/db/schema/index.ts` — `export * from './trainers'; export * from './clients';` ... etc.
- `src/db/schema/relations.ts` — `defineRelations(...)` linking `trainers ↔ clients/calendar_events/attendance_records` (one-to-many), `clients ↔ calendar_events/attendance_records`, `calendar_events ↔ attendance_records` (one-to-one).
- `src/db/types.ts` — branded `TrainerId` type:

  ```ts
  export type TrainerId = string & { __brand: 'TrainerId' };
  ```

Primary keys: use `gen_random_uuid()` (pgcrypto, built-in to Postgres). UUID v7 via extension is nice-to-have but adds setup; v4 is fine for v1.

## Acceptance

- [x] All 9 schema files exist under `src/db/schema/` — trainers, trainer_google_tokens, clients, calendar_events, attendance_records, app_settings, session, account, verification
- [x] `src/db/schema/index.ts` re-exports every table (real barrel, replaces stub from T-002)
- [x] `src/db/schema/relations.ts` defines relations for 8 of 9 tables (verification has no FKs — Better Auth's adapter manages it standalone)
- [x] `src/db/types.ts` exports `TrainerId` branded type with `readonly __brand` marker
- [x] Every business table has `trainer_id NOT NULL` enforced: clients/calendar_events/attendance_records via `.notNull()`; trainer_google_tokens and app_settings via `.primaryKey()` (implicit NOT NULL)
- [x] `calendar_events` has `uniqueIndex('calendar_events_trainer_google_event_unique').on(t.trainerId, t.googleEventId)` per FR-009 dedup
- [x] `attendance_records.calendar_event_id` has `.unique()` (1:1 with calendar_events per FR-014)
- [x] `trainer_google_tokens.nonce` and `.ciphertext` are `bytea` (via Drizzle `customType<{ data: Buffer; driverData: Buffer }>`) with `.notNull()`
- [x] `clients.email` is `.notNull()` per FR-004 (GCal attendee mapping requires email)
- [x] `pnpm exec tsc --noEmit` passes (no type errors)
- [x] `pnpm exec drizzle-kit check` → "Everything's fine 🐶🔥" (schema is parseable by drizzle-kit)

## Completion notes (2026-05-28)

- **ID type strategy**: all PKs use `text('id').primaryKey()` to match Better Auth's adapter convention. Business tables use `.$defaultFn(() => crypto.randomUUID())` for client-side UUID generation. Better Auth tables (trainers, session, account, verification) accept Better Auth's nanoid-style ID generation.
- **Timestamp strategy**: all `timestamp(..., { withTimezone: true })` (Postgres `timestamptz`). Stored as UTC, display conversion to Europe/Warsaw happens in React via next-intl. Matches NFR.
- **`trainers` is Better Auth's renamed `user` table**: configured in T-006 via `betterAuth({ user: { modelName: 'trainers' } })`. Better Auth's adapter respects the rename when generating queries.
- **`account.password` column kept** for Better Auth adapter compatibility even though `emailAndPassword.enabled: false` in v1. Stays NULL.
- **`calendar_event_status` enum**: `confirmed | cancelled | deleted` — supports FR-010 orphan-flag flow (calendar event removed upstream, attendance record preserved as orphaned).
- **`client_status` enum**: `active | inactive` — soft-delete only per FR-006.
- **bytea custom type**: Drizzle 0.45 doesn't ship first-class bytea helper; defined inline in trainer_google_tokens.ts as `customType<{ data: Buffer; driverData: Buffer }>`.
- **Relations cover 8 tables**: trainers ↔ {clients, calendar_events, attendance_records, googleTokens, settings, sessions, accounts} + back-references. verification has no relations (standalone Better Auth bookkeeping).
- **Branded `TrainerId` type** lands at `src/db/types.ts` (separate from `schema/` because it's not a table). Per AGENTS.md critical rule: query functions in S-NN slices will take `trainerId: TrainerId` as first argument; cast happens once in `requireAuth()` helper (T-006).
- **No actual DB migration yet** — that's T-004 (`pnpm db:generate` produces `drizzle/0000_*.sql`, then `pnpm db:migrate` applies it).

## Notes

- Reference for Better Auth's Drizzle table shape: their docs at `https://www.better-auth.com/docs/adapters/drizzle` (don't fetch — they'll be installed; check `node_modules/better-auth/dist/...`).
- Better Auth tables (`session`, `account`, `verification`) have a fixed shape — don't customize beyond what the adapter expects.
- `trainers` is the renamed Better Auth `user` table. The rename is done via Better Auth config in T-006 — schema-wise, just use the table name `trainers`.
- `attendance_records.rate_pln_snapshot` is the per-session captured rate per FR-014 (rate at moment of "came" marking). NOT a FK to client rate — it's an immutable copy.
- Branded `TrainerId` type: query functions in S-NN slices will take it as first arg. Schema files don't enforce branding — they expose UUID strings; branding lives at the query layer.
- All `timestamp` columns: default to `timestamp with time zone (timestamptz)`. UTC at rest; display conversion to Europe/Warsaw is a render concern.
