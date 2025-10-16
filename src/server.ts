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

import { app, initDev } from './app.js';
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
const initServices = async () => {
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
// DEVELOPMENT INITIALIZATION
// ============================================================================

/**
 * Initialize development environment if NODE_ENV is set to 'development'
 * This includes database seeding, schema sync, and route logging
 */
const initDevelopment = async () => {
  if (process.env.NODE_ENV === 'development') {
    await initDev();
  }
};

// En tests no inicializamos servicios pesados ni seeding
if (process.env.NODE_ENV !== 'test') {
  await initServices();
  await initDevelopment();
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the Express server on the configured port
 * Logs server information including environment and access URL
 */
let server: import('http').Server | undefined;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(env.PORT, () => {
    logger.info(
      `Server running on http://localhost:${env.PORT}/ [${process.env.NODE_ENV}]`
    );
  });
}

export { server };
