// ============================================================================
// HEALTH CONTROLLER - Health check endpoints with security information
// ============================================================================

import { Request, Response } from 'express';
import { orm } from '../db/orm.js';
import logger from '../utils/logger.js';
import { env } from '../../config/env.js';
import { redisService } from '../services/redis.service.js';
import { cacheService } from '../services/cache.service.js';
import { emailService } from '../services/email.service.js';

/**
 * Health check controller with comprehensive system status
 */
export class HealthController {

  /**
   * Basic health check - Quick status verification
   */
  async basicHealth(req: Request, res: Response) {
    try {
      // Database connectivity check
      await orm.em.findOne('User', { id: { $ne: null } }, { fields: ['id'] });

      return res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      });
    } catch (error) {
      logger.error({ err: error }, 'Health check failed');

      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  }

  /**
   * Detailed health check - Comprehensive system status
   */
  async detailedHealth(req: Request, res: Response) {
    const startTime = Date.now();
    const healthData: any = {
      success: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
      services: {},
    };

    // Database health check
    try {
      const dbStart = Date.now();
      await orm.em.findOne('User', { id: { $ne: null } }, { fields: ['id'] });
      healthData.services.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
      };
    } catch (error) {
      healthData.success = false;
      healthData.services.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
    }

    // Redis and Cache health check
    try {
      const redisAvailable = await redisService.isAvailable();
      const cacheStats = await cacheService.getStats();

      healthData.services.redis = {
        status: redisAvailable ? 'healthy' : 'unavailable',
        available: redisAvailable,
        stats: cacheStats.redis.stats,
      };

      healthData.services.cache = {
        status: 'healthy',
        memory: cacheStats.memory,
        ttl: cacheStats.ttl,
      };
    } catch (error) {
      healthData.services.redis = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Redis health check failed',
      };
      healthData.services.cache = {
        status: 'error',
        error: 'Cache service unavailable',
      };
    }

    // Security configuration check
    healthData.security = {
      securityHeaders: env.ENABLE_SECURITY_HEADERS,
      rateLimiting: env.ENABLE_RATE_LIMITING,
      corsEnabled: !!env.ALLOWED_ORIGINS,
      helmetEnabled: env.ENABLE_SECURITY_HEADERS,
    };

    // Memory usage
    const memUsage = process.memoryUsage();
    healthData.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    };

    // Response time
    healthData.responseTime = Date.now() - startTime;

    const statusCode = healthData.success ? 200 : 503;

    return res.status(statusCode).json(healthData);
  }

  /**
   * Kubernetes readiness probe
   * Used by container orchestrators to determine if the service is ready
   */
  async readiness(req: Request, res: Response) {
    try {
      // Check if database is accessible
      await orm.em.findOne('User', { id: { $ne: null } }, { fields: ['id'] });

      // Check if all required environment variables are set
      const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'JWT_SECRET'];
      const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

      if (missingEnvVars.length > 0) {
        return res.status(503).json({
          success: false,
          status: 'not ready',
          error: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
        });
      }

      return res.status(200).json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        status: 'not ready',
        error: 'Database not accessible',
      });
    }
  }

  /**
   * Kubernetes liveness probe
   * Used by container orchestrators to determine if the service should be restarted
   */
  async liveness(req: Request, res: Response) {
    // Simple check - if the service is responding, it's alive
    // More sophisticated checks could be added here

    return res.status(200).json({
      success: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /**
   * Email service debug - Temporary endpoint to check email configuration
   */
  async emailDebug(req: Request, res: Response) {
    try {
      const testEmail = req.query.test as string;
      const reinit = req.query.reinit as string;

      const response: any = {
        success: true,
        timestamp: new Date().toISOString(),
      };

      // Force re-initialization if requested
      if (reinit === 'true') {
        try {
          await emailService.initialize();
        } catch (initError) {
          // Capture the error to show what's preventing initialization
          response.initializationError = {
            message: initError instanceof Error ? initError.message : String(initError),
            stack: initError instanceof Error ? initError.stack : undefined,
          };
        }
      }

      // Get current stats after potential re-initialization
      const emailStats = emailService.getStats();

      response.emailService = {
        enabled: emailStats.enabled,
        configured: emailStats.configured,
        provider: emailStats.provider,
        hasCredentials: emailStats.hasCredentials,
        hasSendGridCredentials: emailStats.hasSendGridCredentials,
      };

      response.environment = {
        nodeEnv: env.NODE_ENV,
        emailVerificationRequired: env.EMAIL_VERIFICATION_REQUIRED,
        hasSendGridApiKey: !!process.env.SENDGRID_API_KEY,
        hasSendGridFrom: !!process.env.SENDGRID_FROM,
        hasSmtpUser: !!process.env.SMTP_USER,
        hasSmtpPass: !!process.env.SMTP_PASS,
        frontendUrl: process.env.FRONTEND_URL,
        // Show actual values (masked) for debugging
        sendgridApiKeyPrefix: process.env.SENDGRID_API_KEY?.substring(0, 10) + '...',
        sendgridFromValue: process.env.SENDGRID_FROM,
      };

      // Send test email if requested
      if (testEmail && emailStats.enabled) {
        logger.info({ testEmail }, 'Sending test email');
        const emailSent = await emailService.sendVerificationEmail(
          testEmail,
          'test-token-' + Date.now(),
          'Test User'
        );
        response.testEmail = {
          to: testEmail,
          sent: emailSent,
        };
      }

      return res.status(200).json(response);
    } catch (error) {
      logger.error({ err: error }, 'Email debug check failed');

      return res.status(500).json({
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Email debug failed',
      });
    }
  }
}
