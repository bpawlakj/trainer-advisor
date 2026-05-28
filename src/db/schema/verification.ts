import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Better Auth's verification table — short-lived tokens for email
// verification, magic links, password reset, etc. In v1 (Google-only auth)
// this stays mostly unused, but Better Auth's adapter expects it to exist.
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
