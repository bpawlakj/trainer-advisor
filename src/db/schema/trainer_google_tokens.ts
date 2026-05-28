import { pgTable, text, timestamp, customType } from 'drizzle-orm/pg-core';
import { trainers } from './trainers';

// Postgres `bytea` mapped to Node Buffer. Drizzle 0.45 doesn't ship a
// first-class bytea helper, so we customType it.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// Encrypted Google OAuth refresh tokens — one row per trainer.
// (nonce, ciphertext) split rather than concatenated so we can rotate the
// libsodium master key later (re-encrypt and update both columns in a
// transaction) without parsing concatenated bytea.
//
// Better Auth's `encryptOAuthTokens` callback (configured in T-006) populates
// `account.refresh_token` with `base64(nonce || ciphertext)`. This separate
// `trainer_google_tokens` table is for any post-OAuth flow that needs to
// store / rotate the Google refresh token outside Better Auth's account row
// (set up properly in S-01 when the OAuth round-trip actually lands).
export const trainerGoogleTokens = pgTable('trainer_google_tokens', {
  trainerId: text('trainer_id')
    .primaryKey()
    .references(() => trainers.id, { onDelete: 'cascade' }),
  nonce: bytea('nonce').notNull(),
  ciphertext: bytea('ciphertext').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  scope: text('scope'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
