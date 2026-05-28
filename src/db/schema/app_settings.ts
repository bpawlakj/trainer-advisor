import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { trainers } from './trainers';

// Per-trainer settings. Primary key IS `trainer_id` (1:1 with trainers).
// Defaults match NFRs: Europe/Warsaw timezone, 60-min default session.
//
// `prefs` jsonb is the catch-all for future UX toggles (e.g. summary
// template selection, message format preferences) without requiring a
// migration per new option.
export const appSettings = pgTable('app_settings', {
  trainerId: text('trainer_id')
    .primaryKey()
    .references(() => trainers.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('Europe/Warsaw'),
  defaultSessionMinutes: integer('default_session_minutes').notNull().default(60),
  prefs: jsonb('prefs').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
