import { pgTable, text, timestamp, jsonb, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { trainers } from './trainers';
import { clients } from './clients';

// confirmed = visible in GCal as a real upcoming/past session
// cancelled = GCal still has the event but marked status:cancelled
// deleted   = GCal returned 410 on incremental sync (event removed upstream)
//
// Attendance records persist across `cancelled` / `deleted` events per FR-010
// — never cascade-delete attendance based on event status changes.
export const calendarEventStatus = pgEnum('calendar_event_status', [
  'confirmed',
  'cancelled',
  'deleted',
]);

// Events synced from Google Calendar. `(trainer_id, google_event_id)` is
// UNIQUE — same upstream id can appear across multiple trainers (multi-tenant
// future) but only once per trainer.
//
// `client_id` is nullable because not every event has a matched attendee on
// first sync — events fail to map when attendee email doesn't match any
// `clients.email` (FR-009 "unknown attendee" state). S-04 lets the trainer
// add a client for the unknown attendee, which then back-fills `client_id`.
//
// `raw` holds the upstream Google event payload — preserved for debugging,
// recurring-event resolution (FR-010 / Open Roadmap Question 5), and audit.
export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    trainerId: text('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    googleEventId: text('google_event_id').notNull(),
    clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: calendarEventStatus('status').notNull().default('confirmed'),
    raw: jsonb('raw').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('calendar_events_trainer_google_event_unique').on(t.trainerId, t.googleEventId)],
);
