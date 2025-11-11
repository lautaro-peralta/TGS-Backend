// ============================================================================
// POLYFILLS & METADATA
// ============================================================================

// Enable TypeScript decorators metadata reflection
import 'reflect-metadata';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Load environment variables from .env file
import 'dotenv/config';

// ============================================================================
// IMPORTS - Application & Configuration
// ============================================================================

import { app, initServices, initDev } from './app.js';
import { env } from './config/env.js';
import logger from './shared/utils/logger.js';
import { redisService } from './shared/services/redis.service.js';

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

/**
 * Configure trust proxy for accurate IP detection behind reverse proxies
 * Important for rate limiting and security monitoring
 */
if (env.TRUST_PROXY) {
  app.set('trust proxy', 1); // Trust first proxy
  logger.info('Trust proxy enabled for security middleware');
}

// ============================================================================
// SERVICES INITIALIZATION
// ============================================================================

/**
 * Initialize external services
 * Redis service initialization with graceful fallback
 */
const initRedis = async () => {
  // Only attempt Redis connection if it's enabled
  if (env.REDIS_ENABLED) {
    try {
      // Initialize Redis service (with fallback to memory cache)
      await redisService.connect();
      logger.info('Redis service initialized successfully');
    } catch (error) {
      logger.warn({ err: error }, 'Redis service initialization failed, using memory fallback');
    }
  } else {
    logger.info('Redis is disabled, using in-memory cache only');
  }
};

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

/**
 * Initialize all services and environment-specific features
 * Order matters:
 * 1. Redis (optional, for caching)
 * 2. Critical services (email, scheduler) - ALL ENVIRONMENTS
 * 3. Development features (only in dev mode)
 */
logger.info('Starting application initialization...');

// Step 1: Initialize Redis
await initRedis();

// Step 2: Initialize critical services (email, scheduler)
// This MUST run in all environments (dev, production, etc.)
logger.info('Initializing critical services (email, scheduler)...');
await initServices();

// Step 3: Initialize development-specific features
if (process.env.NODE_ENV === 'development') {
  logger.info('Initializing development environment...');
  await initDev();
}

logger.info('Application initialization completed successfully');

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the Express server on the configured port
 * Logs server information including environment and access URL
 */
app.listen(env.PORT, () => {
  logger.info(
    `Server running on http://localhost:${env.PORT}/ [${process.env.NODE_ENV}]`
  );
});
