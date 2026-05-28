import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { trainers } from './trainers';

// Better Auth's session table. `user_id` points at `trainers.id` after
// the user→trainers rename. ON DELETE CASCADE so trainer deletion sweeps
// their sessions.
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => trainers.id, { onDelete: 'cascade' }),
});
