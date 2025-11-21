// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { v7 as uuidv7 } from 'uuid';
import { RequestContext } from '@mikro-orm/core';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.js';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import logger from './shared/utils/logger.js';
import { logRoutes } from './shared/utils/pretty.log.js';
import { orm, syncSchema } from './shared/db/orm.js';
import { createAdminDev, createZoneDev } from './shared/initDev.js';
import { env } from './config/env.js';

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
import { emailVerificationRouter } from './modules/auth/emailVerification/emailVerification.routes.js';
import { userVerificationRouter } from './modules/auth/userVerification/userVerification.routes.js';
import { notificationRouter } from './modules/notification/notification.routes.js';

// Import health check routes
import { healthRouter } from './shared/routes/health.routes.js';

// Import Redis management routes
import { redisRouter } from './shared/routes/redis.routes.js';

// Import Cleanup management routes
import { cleanupRouter } from './shared/routes/cleanup.routes.js';

// Import services
import { emailService } from './shared/services/email.service.js';
import { schedulerService } from './shared/services/scheduler.service.js';

// Import security middleware
import {
  securityMiddleware,
  secureCors,
  generalRateLimit,
  authRateLimit,
  sensitiveRateLimit
} from './shared/middleware/security.middleware.js';

// ============================================================================
// APPLICATION SETUP
// ============================================================================
const app = express();

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================



// CORS configuration - Enhanced security
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked for origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
}));

// Security headers and protection middleware
app.use(securityMiddleware);

// Rate limiting - Applied in order of restrictiveness (disabled in development)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth', authRateLimit);           // Stricter limits for auth
  app.use('/api/admin', sensitiveRateLimit);     // Sensitive operations
  app.use(generalRateLimit);                     // General API rate limiting
  logger.info('Rate limiting enabled (production mode)');
} else {
  logger.info('Rate limiting disabled (development mode)');
}

// Body parsing (after security middleware for proper sanitization)
app.use(express.json({ limit: '10mb' }));      // Limit payload size

// Cookie parsing
app.use(cookieParser());

// Serve static files (for Swagger customizations)
app.use(express.static('public'));

// Favicon handlers - serve SVG favicon
app.get('/favicon.ico', (_req, res) => {
  res.redirect('/favicon.svg');
});

app.get('/favicon.svg', (_req, res) => {
  res.sendFile('favicon.svg', { root: 'public' });
});

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
// API DOCUMENTATION
// ============================================================================

// Swagger UI - API Documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'The Garrison System API',
  customCss: `
    /* Hide default topbar */
    .swagger-ui .topbar { display: none }

    /* Modern, clean styles - Black, Light Blue, White palette */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8f9fa;
    }

    .swagger-ui { max-width: 1400px; margin: 0 auto; }

    /* Info section - clean white card */
    .swagger-ui .info {
      margin: 40px 0;
      padding: 35px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      border-top: 4px solid #3498db;
    }
    .swagger-ui .info .title {
      font-size: 42px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 20px;
      letter-spacing: -0.5px;
    }
    .swagger-ui .info .description {
      font-size: 15px;
      line-height: 1.7;
      color: #2c3e50;
    }
    .swagger-ui .info .description h2 {
      color: #1a1a1a;
      font-size: 24px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      font-weight: 700;
    }
    .swagger-ui .info .description h3 {
      color: #2c3e50;
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .swagger-ui .info .description code {
      background: #ecf0f1;
      padding: 3px 8px;
      border-radius: 4px;
      color: #3498db;
      font-size: 13px;
      font-weight: 600;
    }

    /* Scheme container - sleek black with light blue accent */
    .swagger-ui .scheme-container {
      background: linear-gradient(135deg, #1a1a1a 0%, #2c3e50 100%);
      padding: 25px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      border: 1px solid #3498db;
    }

    /* Servers label - bright white for visibility */
    .swagger-ui .scheme-container label {
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* Custom style for servers title */
    .swagger-ui .servers-title {
      color: #ffffff !important;
    }

    /* Server dropdown - white with blue accent */
    .swagger-ui .scheme-container select {
      background: #ffffff;
      color: #1a1a1a;
      border: 2px solid #3498db;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
      transition: all 0.3s ease;
      margin-left: 12px;
    }
    .swagger-ui .scheme-container select:hover {
      background: #3498db;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
      transform: translateY(-2px);
    }

    /* Hide authorize button */
    .swagger-ui .auth-wrapper {
      display: none !important;
    }

    /* Filter input - light blue accent */
    .swagger-ui .filter-container input {
      border: 2px solid #dce4e9;
      border-radius: 10px;
      padding: 12px 18px;
      font-size: 14px;
      transition: all 0.3s ease;
      background: #ffffff;
    }
    .swagger-ui .filter-container input:focus {
      border-color: #3498db;
      box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.1);
      outline: none;
      background: #ffffff;
    }

    /* Operation blocks - clean white cards */
    .swagger-ui .opblock {
      margin: 15px 0;
      border-radius: 10px;
      border: 2px solid #ecf0f1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
      overflow: hidden;
      background: #ffffff;
    }
    .swagger-ui .opblock:hover {
      border-color: #3498db;
      box-shadow: 0 4px 16px rgba(52, 152, 219, 0.15);
      transform: translateY(-2px);
    }
    .swagger-ui .opblock .opblock-summary-method {
      min-width: 85px;
      font-weight: 700;
      border-radius: 6px;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }

    /* HTTP Method colors - keeping standard colors for clarity */
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #3498db;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #27ae60;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: #f39c12;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method {
      background: #16a085;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #e74c3c;
    }

    .swagger-ui .opblock-tag {
      font-size: 26px;
      margin: 35px 0 15px 0;
      font-weight: 700;
      color: #1a1a1a;
      border-left: 5px solid #3498db;
      padding-left: 15px;
      background: #ffffff;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    /* Response/Request sections */
    .swagger-ui .opblock-section {
      background: #f8f9fa;
    }

    /* Try it out button - light blue */
    .swagger-ui .btn.try-out__btn {
      background: #3498db;
      border-color: #3498db;
      color: #ffffff;
      border-radius: 8px;
      font-weight: 700;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 20px;
    }
    .swagger-ui .btn.try-out__btn:hover {
      background: #2980b9;
      border-color: #2980b9;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }

    /* Execute button - contrasting teal/green */
    .swagger-ui .btn.execute {
      background: #1abc9c;
      border-color: #1abc9c;
      color: #ffffff;
      border-radius: 8px;
      font-weight: 700;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 20px;
    }
    .swagger-ui .btn.execute:hover {
      background: #16a085;
      border-color: #16a085;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(26, 188, 156, 0.3);
    }

    /* Cancel button */
    .swagger-ui .btn.cancel {
      background: #2c3e50;
      border-color: #2c3e50;
      color: #ffffff;
    }
    .swagger-ui .btn.cancel:hover {
      background: #1a1a1a;
      border-color: #1a1a1a;
    }

    /* Schemas section - estructura simple */
    .swagger-ui section.models {
      margin-top: 40px;
      padding: 20px;
      background: #ffffff;
    }

    /* Schemas title */
    .swagger-ui section.models h4,
    .swagger-ui section.models h4 span {
      font-size: 28px !important;
      font-weight: 700 !important;
      color: #1a1a1a !important;
      margin: 0 0 20px 0 !important;
      padding: 0 0 10px 0 !important;
      border-bottom: 2px solid #1a1a1a !important;
    }

    /* Container for each schema */
    .swagger-ui section.models .model-container {
      margin-bottom: 15px;
      border: 1px solid #ddd;
      background: #ffffff;
    }

    /* Model reset */
    .swagger-ui .model-container .model-box {
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Individual schema title */
    .swagger-ui .model-box > .model-toggle {
      padding: 12px 16px !important;
      background: #f5f5f5 !important;
      border-bottom: 1px solid #ddd !important;
      cursor: pointer !important;
    }

    .swagger-ui .model-toggle .model-title,
    .swagger-ui .model-toggle .model-title span {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: #1a1a1a !important;
      margin: 0 !important;
    }

    /* Expanded content - no overlap */
    .swagger-ui .model-container .model {
      padding: 16px !important;
      background: #ffffff !important;
      margin: 0 !important;
      clear: both !important;
      overflow: visible !important;
    }

    .swagger-ui .model-container.model-open {
      overflow: visible !important;
    }

    .swagger-ui .model-box .model {
      border: none !important;
    }

    /* Properties table */
    .swagger-ui table.model {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 0 !important;
    }

    .swagger-ui table.model tbody tr {
      border-bottom: 1px solid #eee !important;
    }

    .swagger-ui table.model tbody tr:last-child {
      border-bottom: none !important;
    }

    .swagger-ui table.model tbody tr td {
      padding: 10px 8px !important;
      vertical-align: top !important;
    }

    /* Property name */
    .swagger-ui table.model tbody tr td:first-child {
      font-weight: 600 !important;
      color: #1a1a1a !important;
      width: 30% !important;
    }

    /* Type and description */
    .swagger-ui table.model tbody tr td:nth-child(2) {
      color: #333 !important;
      width: 70% !important;
    }

    /* Type badge */
    .swagger-ui .prop-type {
      padding: 2px 8px !important;
      background: #3498db !important;
      color: #fff !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      margin-right: 8px !important;
    }

    /* Asterisco requerido */
    .swagger-ui .required {
      color: #e74c3c !important;
      margin-left: 4px !important;
    }

    /* Response tabs */
    .swagger-ui .response-col_status {
      color: #1a1a1a;
      font-weight: 700;
    }

    /* Parameters table */
    .swagger-ui table thead tr th {
      color: #1a1a1a;
      font-weight: 700;
      border-bottom: 2px solid #3498db;
    }

    /* Links */
    .swagger-ui a {
      color: #3498db;
      font-weight: 600;
    }
    .swagger-ui a:hover {
      color: #2980b9;
    }
  `,
  customfavIcon: '/favicon.svg',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    },
    tryItOutEnabled: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
  },
  customJs: ['/swagger-custom.js'],
}));

// Endpoint to get the JSON specification
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================================================
// API ROUTES
// ============================================================================

// Root route - Serve landing page
app.get('/', (_req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Health checks - Should be before other routes for proper monitoring
app.use('/health', healthRouter);

// Redis management - Admin only routes for Redis monitoring and management
app.use('/admin/redis', redisRouter);

// Cleanup management - Admin only routes for cleanup and scheduler operations
app.use('/admin/cleanup', cleanupRouter);

// Authentication & User management
app.use('/api/auth', authRouter);
app.use('/api/role-requests', roleRequestRouter);
app.use('/api/users', userRouter);
app.use('/api/email-verification', emailVerificationRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/user-verification', userVerificationRouter);

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

// Import error middleware
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware.js';

// 404 - Route not found handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVICES INITIALIZATION (ALL ENVIRONMENTS)
// ============================================================================

/**
 * Initializes critical services that must run in all environments
 * - Email service (SendGrid in production, SMTP in development)
 * - Scheduler service (automated cleanup tasks)
 *
 * This function MUST be called on application startup regardless of NODE_ENV
 */
export const initServices = async () => {
  // Initialize email service
  try {
    await emailService.initialize();

    const emailStats = emailService.getStats();
    const isProduction = process.env.NODE_ENV === 'production';

    if (emailService.isAvailable()) {
      logger.info({
        provider: emailStats.provider,
        hasSendGrid: emailStats.hasSendGridCredentials,
        hasSmtp: emailStats.hasCredentials
      }, 'Email service ready and available');
    } else {
      if (isProduction) {
        logger.error('Email service not available in PRODUCTION - this is critical!');
        logger.error('Configure SENDGRID_API_KEY and SENDGRID_FROM in environment variables');
        // In production, throw error if email service is not available
        throw new Error('Email service is required in production but not configured');
      } else {
        logger.warn('Email service initialized but not available (missing SMTP credentials)');
        logger.info('To enable emails, configure SMTP variables in .env.development:');
        logger.info('   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
      }
    }

    // Log email verification requirement status
    if (env.EMAIL_VERIFICATION_REQUIRED) {
      logger.info('Email verification: REQUIRED (users must verify email before login)');
    } else {
      logger.warn('Email verification: DISABLED (demo mode - users can login without verification)');
      if (!isProduction) {
        logger.info('To enable email verification, set EMAIL_VERIFICATION_REQUIRED=true in .env');
      }
    }
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      logger.error({ err: error }, 'CRITICAL: Email service initialization failed in production');
      throw error; // Fail fast in production
    } else {
      logger.warn({ err: error }, 'Email service initialization failed (continuing without email functionality)');
      logger.info('This is normal in development if SMTP is not configured');
    }
  }

  // Initialize scheduler service for automated tasks
  try {
    schedulerService.start();
    const status = schedulerService.getStatus();

    logger.info({
      taskCount: status.taskCount,
      tasks: status.tasks,
      environment: process.env.NODE_ENV
    }, 'Scheduler service started - automated cleanup enabled');
  } catch (error) {
    logger.error({ err: error }, 'Failed to start scheduler service');
    // Don't throw - scheduler is important but not critical for app startup
  }
};

// ============================================================================
// DEVELOPMENT INITIALIZATION
// ============================================================================

/**
 * Initializes development-specific features
 * - Syncs database schema
 * - Creates default admin user
 * - Creates default zones
 * - Logs available routes
 *
 * Only runs when NODE_ENV === 'development'
 */
export const initDev = async () => {
  if (process.env.NODE_ENV === 'development') {
    await syncSchema();
    await createAdminDev();
    await createZoneDev();

    logger.info("Loading development routes...");
    logRoutes([
      '/api-docs',
      '/health',
      '/api/auth',
      '/api/clients',
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
      '/api/email-verification',
      '/api/user-verification',
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