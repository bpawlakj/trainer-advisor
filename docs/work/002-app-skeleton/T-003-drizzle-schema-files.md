---
id: T-003
title: Drizzle schema — 9 table files + barrel + relations
status: pending
plan: ../plan.md
created: 2026-05-27
completed: null
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

- [ ] All 9 schema files exist under `src/db/schema/`
- [ ] `src/db/schema/index.ts` re-exports every table
- [ ] `src/db/schema/relations.ts` defines relations between business tables
- [ ] `src/db/types.ts` exports `TrainerId` branded type
- [ ] Every business table (clients, calendar_events, attendance_records, app_settings, trainer_google_tokens) has `trainer_id NOT NULL` in TS schema definition
- [ ] `calendar_events` has `UNIQUE(trainer_id, google_event_id)` constraint
- [ ] `attendance_records.calendar_event_id` has `UNIQUE` (1:1 with calendar_events)
- [ ] `trainer_google_tokens.nonce` and `.ciphertext` are `bytea NOT NULL`
- [ ] `clients.email` is `NOT NULL` (per FR-004)
- [ ] `pnpm tsc --noEmit` passes (no type errors in schema files)

## Notes

- Reference for Better Auth's Drizzle table shape: their docs at `https://www.better-auth.com/docs/adapters/drizzle` (don't fetch — they'll be installed; check `node_modules/better-auth/dist/...`).
- Better Auth tables (`session`, `account`, `verification`) have a fixed shape — don't customize beyond what the adapter expects.
- `trainers` is the renamed Better Auth `user` table. The rename is done via Better Auth config in T-006 — schema-wise, just use the table name `trainers`.
- `attendance_records.rate_pln_snapshot` is the per-session captured rate per FR-014 (rate at moment of "came" marking). NOT a FK to client rate — it's an immutable copy.
- Branded `TrainerId` type: query functions in S-NN slices will take it as first arg. Schema files don't enforce branding — they expose UUID strings; branding lives at the query layer.
- All `timestamp` columns: default to `timestamp with time zone (timestamptz)`. UTC at rest; display conversion to Europe/Warsaw is a render concern.
