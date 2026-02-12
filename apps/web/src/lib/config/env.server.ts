import { env } from '@/lib/env';

export const serverEnv = {
  DATABASE_URL: env.DATABASE_URL,
  SESSION_SECRET: env.SESSION_SECRET,
  AUTH_STRATEGY: env.AUTH_STRATEGY,
  PHARMA_PARTNER_KEY: env.PHARMA_PARTNER_KEY,
} as const;

export type ServerEnv = typeof serverEnv;
