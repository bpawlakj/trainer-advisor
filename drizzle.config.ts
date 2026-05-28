import type { Config } from 'drizzle-kit';
import { env } from './src/env';

export default {
  schema: './src/db/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.SUPABASE_DIRECT_URL,
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
} satisfies Config;
