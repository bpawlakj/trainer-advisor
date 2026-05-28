import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';
import * as schema from './schema';

// Supavisor transaction-mode pooler (port 6543).
// `prepare: false` is REQUIRED — without it, prepared statements through
// the pooler fail under concurrency with cryptic "prepared statement
// not found" errors. See AGENTS.md § Supavisor.
const client = postgres(env.SUPABASE_DATABASE_URL, {
  prepare: false,
  max: 10,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
