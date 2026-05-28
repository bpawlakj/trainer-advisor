import { pgTable, text, timestamp, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { trainers } from './trainers';

// Active / inactive only — soft-delete via status flip per FR-006.
// Never hard-delete in v1; deactivation preserves attendance history.
export const clientStatus = pgEnum('client_status', ['active', 'inactive']);

// Trainer's clients. `email` is NOT NULL because the entire GCal-to-client
// mapping (FR-009) uses attendee email — a client without email cannot be
// auto-mapped. For "no-email" trainers (Open Roadmap Question 3), the UI
// generates a placeholder address in S-04.
//
// `rate_pln` is the *current* per-session rate. Historical attendance
// records snapshot this value at "came" time into
// `attendance_records.rate_pln_snapshot` (FR-014).
export const clients = pgTable('clients', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  trainerId: text('trainer_id')
    .notNull()
    .references(() => trainers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  ratePln: numeric('rate_pln', { precision: 10, scale: 2 }).notNull(),
  status: clientStatus('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
