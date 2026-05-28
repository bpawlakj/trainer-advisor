import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { trainers } from './trainers';

// Better Auth's account table — one row per (user, provider) pairing.
// For trainer-advisor v1, only Google OAuth is enabled (emailAndPassword: false),
// so the only rows are Google accounts linked to trainers.
//
// `refresh_token` / `access_token` are encrypted at rest via libsodium when
// Better Auth's `encryptOAuthTokens` config is on (T-006). The Bearer-side
// representation stored here is `base64(nonce + ciphertext)`.
//
// `password` column is part of Better Auth's canonical schema — kept here
// for adapter compatibility even though it stays NULL with email+password
// disabled.
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => trainers.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
