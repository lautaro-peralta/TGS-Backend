// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { v7 as uuidv7 } from 'uuid';
import { RequestContext } from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import logger from './shared/utils/logger.js';
import { logRoutes } from './shared/utils/pretty.log.js';
import { orm, syncSchema } from './shared/db/orm.js';
import { createAdminDev, createZoneDev } from './shared/initDev.js';

// ============================================================================
// IMPORTS - Route handlers
// ============================================================================
import { clientRouter } from './modules/client/client.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';

import { saleRouter } from './modules/sale/sale.routes.js';
import { productRouter } from './modules/product/product.routes.js';
import { authorityRouter } from './modules/authority/authority.routes.js';
import { zoneRouter } from './modules/zone/zone.routes.js';
import { distributorRouter } from './modules/distributor/distributor.routes.js';
import { bribeRouter } from './modules/bribe/bribe.routes.js';
import { decisionRouter } from './modules/decision/decision.routes.js';
import { topicRouter } from './modules/topic/topic.routes.js';
import { partnerRouter } from './modules/partner/partner.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { shelbyCouncilRouter } from './modules/shelbyCouncil/shelbyCouncil.routes.js';
import { clandestineAgreementRouter } from './modules/clandestineAgreement/clandestineAgreement.routes.js'; 
import { monthlyReviewRouter } from './modules/shelbyCouncil/monthlyReview.routes.js';
import { roleRequestRouter } from './modules/auth/roleRequest/roleRequest.routes.js';
import { userRouter } from './modules/auth/user/user.routes.js';

// ============================================================================
// APPLICATION SETUP
// ============================================================================
const app = express();

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors());

// Body parsing
app.use(express.json());

// Cookie parsing
app.use(cookieParser());

// Request logging and monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Generate unique request ID
  req.requestId = uuidv7();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusClass = Math.floor(res.statusCode / 100);

    // Determine log level based on status code
    const logLevel =
      statusClass >= 5 ? 'error' : statusClass >= 4 ? 'warn' : 'info';

    res.responseTime = duration;

    logger[logLevel](
      {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
      },
      `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
    );
  });

  // Log response errors
  res.on('error', (error) => {
    logger.error(
      {
        requestId: req.requestId,
        error: error.message,
      },
      `Response error for ${req.method} ${req.url}`
    );
  });

  next();
});

// Database context middleware (MikroORM)
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

// ============================================================================
// API ROUTES
// ============================================================================

// Authentication & User management
app.use('/api/auth', authRouter);
app.use('/api/role-requests', roleRequestRouter);
app.use('/api/users', userRouter);

// Business entities
app.use('/api/clients', clientRouter);
app.use('/api/sales', saleRouter);
app.use('/api/products', productRouter);
app.use('/api/distributors', distributorRouter);
app.use('/api/partners', partnerRouter);

// Geographic & Administrative
app.use('/api/zones', zoneRouter);
app.use('/api/authorities', authorityRouter);

// Business operations
app.use('/api/bribes', bribeRouter);
app.use('/api/decisions', decisionRouter);
app.use('/api/topics', topicRouter);

// Administrative & Strategic
app.use('/api/admin', adminRouter);
app.use('/api/shelby-council', shelbyCouncilRouter);
app.use('/api/clandestine-agreements', clandestineAgreementRouter);
app.use('/api/monthly-reviews', monthlyReviewRouter);
// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 - Route not found handler
app.use((req, res) => {
  logger.warn(
    {
      req,
    },
    'Route not found'
  );
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((error: any, req: Request, res: Response) => {
  logger.error(
    {
      err: error,
      req,
      requestId: req.requestId,
      stack: error.stack,
    },
    `Unhandled error: ${error.message}`
  );

  res.status(500).json({
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Internal server error',
    requestId: req.requestId,
  });
});

// ============================================================================
// DEVELOPMENT INITIALIZATION
// ============================================================================

/**
 * Initializes development environment
 * - Syncs database schema
 * - Creates default admin user
 * - Creates default zones
 * - Logs available routes
 */
export const initDev = async () => {
  if (process.env.NODE_ENV === 'development') {
    await syncSchema();
    await createAdminDev();
    await createZoneDev();

    console.log();
    logRoutes([
      '/api/clients',
      '/api/auth',
      '/api/sales',
      '/api/authorities',
      '/api/zones',
      '/api/products',
      '/api/bribes',
      '/api/decisions',
      '/api/topics',
      '/api/distributors',
      '/api/admin',
      '/api/shelby-council',
      '/api/clandestine-agreements',
      '/api/monthly-reviews',
      '/api/partners',
      '/api/role-requests',
    ]);
  }
};

// ============================================================================
// PROCESS EVENT HANDLERS
// ============================================================================

// Graceful shutdown on SIGINT
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

// ============================================================================
// EXPORTS
// ============================================================================

export { app };