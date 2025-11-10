// ============================================================================
// REDIS MIDDLEWARE - Error handling middleware and graceful degradation strategies
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { redisService } from '../services/redis.service.js';
import { cacheService } from '../services/cache.service.js';

/**
 * Redis availability verification middleware
 * Checks Redis status before processing the request, logs warning if not available
 */
export const redisHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  // Check Redis status (non-blocking)
  const isRedisAvailable = await redisService.isAvailable().catch(() => false);

  if (!isRedisAvailable) {
    logger.debug('Redis no disponible, usando fallback a caché en memoria');
    // Set flag on request indicating memory cache should be used
    (req as any).useMemoryCache = true;
  }

  next();
};

/**
 * Redis error handling middleware
 * Wraps cache operations with unified error handling and degradation strategy
 */
export const withRedisFallback = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If request is marked to use memory cache, skip Redis operation
      if ((req as any).useMemoryCache) {
        logger.debug(`Omitiendo ${operation} de Redis debido a no disponibilidad`);
        return next();
      }

      // Try to execute next middleware or route handler
      await next();

    } catch (error) {
      // Check if it's a Redis-related error
      const isRedisError = (error as Error).message?.includes('Redis') ||
                          (error as Error).message?.includes('ECONNREFUSED') ||
                          (error as any).code === 'REDIS_ERROR';

      if (isRedisError) {
        logger.warn({ err: error as Error, operation }, `${operation} de Redis falló, continuando con caché en memoria`);

        // Set flag and continue processing
        (req as any).useMemoryCache = true;

        // Retry handler execution, this time will use memory cache
        try {
          await next();
        } catch (retryError) {
          logger.error({ err: retryError, operation }, `Fallback a caché en memoria también falló para ${operation}`);
          throw retryError;
        }
      } else {
        // Non-Redis error, throw directly
        throw error;
      }
    }
  };
};

/**
 * Cache invalidation middleware
 * Automatically invalidates related cache after updating data
 */
export const invalidateCache = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First execute the actual request processing
    await next();

    // If request was successful, invalidate related cache
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        for (const pattern of patterns) {
          await cacheService.delete(pattern);
        }

        if (patterns.length > 0) {
          logger.debug({ patterns }, 'Caché invalidado después de operación exitosa');
        }
      } catch (error) {
        // Cache invalidation failure should not affect main functionality
        logger.warn({ err: error, patterns }, 'Fallo al invalidar patrones de caché');
      }
    }
  };
};

/**
 * Redis monitoring middleware
 * Logs cache hit rate and performance metrics
 */
export const redisMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalJson = res.json;

  // Intercept JSON response to check cache status
  res.json = function(body: any) {
    const duration = Date.now() - startTime;

    // Check if there's a cache flag in the response
    if (body?.pagination?.cached === true) {
      logger.debug(
        {
          method: req.method,
          url: req.url,
          cached: true,
          duration: `${duration}ms`
        },
        'Respuesta servida desde caché'
      );
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Redis error recovery middleware
 * Periodically attempts to recover Redis connection
 */
let redisRecoveryAttempts = 0;
const maxRecoveryAttempts = 5;

export const redisRecovery = async (req: Request, res: Response, next: NextFunction) => {
  // Periodically check and attempt to recover Redis connection
  if (redisRecoveryAttempts < maxRecoveryAttempts) {
    try {
      const isAvailable = await redisService.isAvailable();

      if (isAvailable && (req as any).useMemoryCache) {
        logger.info('Conexión Redis recuperada, volviendo desde caché en memoria');
        (req as any).useMemoryCache = false;
        redisRecoveryAttempts = 0;
      }
    } catch (error) {
      redisRecoveryAttempts++;
      if (redisRecoveryAttempts >= maxRecoveryAttempts) {
        logger.warn('Se alcanzó el máximo de intentos de recuperación de Redis');
      }
    }
  }

  next();
};

/**
 * Combined middleware: Complete error handling and degradation strategy for Redis
 */
export const redisResilienceMiddleware = [
  redisHealthCheck,
  redisMonitoring,
  redisRecovery,
];

/**
 * Cache middleware factory function
 * Creates cache middleware for specific routes
 */
export const createCacheMiddleware = (options: {
  key?: string | ((req: Request) => string);
  ttl?: number;
  condition?: (req: Request) => boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { key, ttl, condition } = options;

    // Check condition
    if (condition && !condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = typeof key === 'function' ? key(req) : key || `${req.method}:${req.originalUrl}`;

    try {
      // Try to get data from cache
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        logger.debug({ cacheKey }, 'Sirviendo desde caché');

        return res.json({
          ...cached,
          cached: true,
          cachedAt: new Date().toISOString(),
        });
      }

      // Intercept response to cache result
      const originalJson = res.json;
      res.json = function(body: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, ttl).catch(error => {
            logger.warn({ err: error, cacheKey }, 'Fallo al cachear respuesta');
          });
        }

        return originalJson.call(this, body);
      };

    } catch (error) {
      logger.warn({ err: error, cacheKey }, 'Error en middleware de caché');
      // Continue normal processing when cache fails
    }

    next();
  };
};
