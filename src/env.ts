import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  SUPABASE_DATABASE_URL: z.string().url(),
  SUPABASE_DIRECT_URL: z.string().url(),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),

  LIBSODIUM_MASTER_KEY: z.string().regex(/^[0-9a-f]{64}$/),

  PG_NET_TOKEN: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  throw new Error('Environment validation failed — see logs above');
}

export const env = parsed.data;
