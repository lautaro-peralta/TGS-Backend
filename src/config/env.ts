import { config } from 'dotenv';
import { z } from 'zod';

// Load the correct file according to NODE_ENV (default: development)
config({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),

  JWT_SECRET: z.string().min(10, 'JWT_SECRET is too short.'),
  JWT_EXPIRES_IN: z.string().default('1h'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);