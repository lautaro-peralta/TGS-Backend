import { config } from 'dotenv';
import { z } from 'zod';

// Load the correct file according to NODE_ENV (default: development)
config({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });

// Detect if running in Docker container
const isDocker = process.env.DOCKER_CONTAINER === 'true';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // Database Configuration - Docker-aware defaults
  DB_HOST: z.string().default(isDocker ? 'mysql' : 'localhost'),
  DB_PORT: z.coerce.number().default(isDocker ? 3306 : 3307),
  DB_USER: z.string().default('dsw'),
  DB_PASSWORD: z.string().default('dsw'),
  DB_NAME: z.string().default('tpdesarrollo'),

  // JWT Secret - Must be at least 32 characters
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Security Configuration
  ALLOWED_ORIGINS: z.string().default(isDocker ? 'http://localhost:3000,http://frontend:3000' : 'http://localhost:3000'),
  TRUST_PROXY: z.coerce.boolean().default(isDocker ? true : false),
  ENABLE_SECURITY_HEADERS: z.coerce.boolean().default(true),
  ENABLE_RATE_LIMITING: z.coerce.boolean().default(true),
  SECURITY_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('warn'),

  // Redis Configuration (Docker-aware)
  REDIS_HOST: z.string().default(isDocker ? 'redis' : 'localhost').optional(),
  REDIS_PORT: z.coerce.number().default(6379).optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0).optional(),

  // Redis availability flag
  REDIS_ENABLED: z.coerce.boolean().default(false), // Disabled by default, enable explicitly

  // CORS Configuration
  CORS_MAX_AGE: z.coerce.number().default(86400), // 24 hours

  // Email Service (SMTP) Configuration - Development with Mailtrap
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // SendGrid Configuration - Production
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM: z.string().email().optional(),

  // Frontend URL (for email links)
  FRONTEND_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);