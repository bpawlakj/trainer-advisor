import { pgTable, text, timestamp, boolean, numeric } from 'drizzle-orm/pg-core';
import { trainers } from './trainers';
import { clients } from './clients';
import { calendarEvents } from './calendar_events';

// Per-event attendance mark. ONE row per calendar event (UNIQUE on
// calendar_event_id) — toggling between came / didn't come updates the
// existing row rather than inserting another.
//
// Attendance is BINARY per AGENTS.md: `attended` true = came, false = didn't.
// No `cancellation_reason`, no `O1`/`O2`, no `excused` — explicit Non-Goal.
//
// `rate_pln_snapshot` captures `clients.rate_pln` at the moment "came" was
// recorded (FR-014). Subsequent rate changes on the client row don't rewrite
// this — past months' revenue stays stable.
//
// `client_id` denormalised here (also reachable via calendar_events → clients)
// because:
//   1. Calendar event may be deleted upstream (cascade nulls client_id on
//      calendar_events) — attendance still needs to know who it billed.
//   2. Faster monthly aggregation queries (no JOIN required).
//
// `client_id` is nullable to support the "orphaned" state — attendance
// recorded against an event whose attendee never got mapped to a client.
export const attendanceRecords = pgTable('attendance_records', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  trainerId: text('trainer_id')
    .notNull()
    .references(() => trainers.id, { onDelete: 'cascade' }),
  calendarEventId: text('calendar_event_id')
    .notNull()
    .unique()
    .references(() => calendarEvents.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  attended: boolean('attended').notNull(),
  ratePlnSnapshot: numeric('rate_pln_snapshot', { precision: 10, scale: 2 }).notNull(),
  markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
