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

// ============================================================================
// DEVELOPMENT INITIALIZATION
// ============================================================================

/**
 * Initialize development environment if NODE_ENV is set to 'development'
 * This includes database seeding, schema sync, and route logging
 */
if (process.env.NODE_ENV === 'development') {
  await initDev();
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the Express server on the configured port
 * Logs server information including environment and access URL
 */
app.listen(env.PORT, () => {
  console.log();
  console.log(
    `Servidor corriendo en http://localhost:${env.PORT}/ [${process.env.NODE_ENV}]`
  );
});
