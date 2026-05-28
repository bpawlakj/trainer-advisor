import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

// Better Auth's primary user table — renamed `user` → `trainers` via the
// `user: { modelName: 'trainers' }` config in src/lib/auth.ts (T-006).
// Better Auth's adapter generates `id` values; we accept whatever it produces
// (nanoid-style strings by default).
export const trainers = pgTable('trainers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
