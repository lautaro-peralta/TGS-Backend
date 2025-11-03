// ============================================================================
// REDIS MIDDLEWARE - Middleware de manejo de errores y estrategias de degradación
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { redisService } from '../services/redis.service.js';
import { cacheService } from '../services/cache.service.js';

/**
 * Middleware de verificación de disponibilidad de Redis
 * Verifica el estado de Redis antes de procesar la solicitud, registra advertencia si no está disponible
 */
export const redisHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  // Verificar estado de Redis (no bloqueante)
  const isRedisAvailable = await redisService.isAvailable().catch(() => false);

  if (!isRedisAvailable) {
    logger.debug('Redis no disponible, usando fallback a caché en memoria');
    // Establecer marca en la solicitud indicando que se debe usar caché en memoria
    (req as any).useMemoryCache = true;
  }

  next();
};

/**
 * Middleware de manejo de errores de Redis
 * Envuelve operaciones de caché con manejo unificado de errores y estrategia de degradación
 */
export const withRedisFallback = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Si la solicitud está marcada para usar caché en memoria, omitir operación de Redis
      if ((req as any).useMemoryCache) {
        logger.debug(`Omitiendo ${operation} de Redis debido a no disponibilidad`);
        return next();
      }

      // Intentar ejecutar el siguiente middleware o manejador de ruta
      await next();

    } catch (error) {
      // Verificar si es un error relacionado con Redis
      const isRedisError = (error as Error).message?.includes('Redis') ||
                          (error as Error).message?.includes('ECONNREFUSED') ||
                          (error as any).code === 'REDIS_ERROR';

      if (isRedisError) {
        logger.warn({ err: error as Error, operation }, `${operation} de Redis falló, continuando con caché en memoria`);

        // Establecer marca y continuar procesamiento
        (req as any).useMemoryCache = true;

        // Reintentar ejecución del manejador, esta vez usará caché en memoria
        try {
          await next();
        } catch (retryError) {
          logger.error({ err: retryError, operation }, `Fallback a caché en memoria también falló para ${operation}`);
          throw retryError;
        }
      } else {
        // Error no relacionado con Redis, lanzar directamente
        throw error;
      }
    }
  };
};

/**
 * Middleware de invalidación de caché
 * Invalida automáticamente el caché relacionado después de actualizar datos
 */
export const invalidateCache = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Primero ejecutar el procesamiento real de la solicitud
    await next();

    // Si la solicitud fue exitosa, invalidar el caché relacionado
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        for (const pattern of patterns) {
          await cacheService.delete(pattern);
        }

        if (patterns.length > 0) {
          logger.debug({ patterns }, 'Caché invalidado después de operación exitosa');
        }
      } catch (error) {
        // El fallo en la invalidación de caché no debe afectar la funcionalidad principal
        logger.warn({ err: error, patterns }, 'Fallo al invalidar patrones de caché');
      }
    }
  };
};

/**
 * Middleware de monitoreo de Redis
 * Registra tasa de aciertos de caché y métricas de rendimiento
 */
export const redisMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalJson = res.json;

  // Interceptar respuesta JSON para verificar estado de caché
  res.json = function(body: any) {
    const duration = Date.now() - startTime;

    // Verificar si hay marca de caché en la respuesta
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
 * Middleware de recuperación de errores de Redis
 * Intenta periódicamente recuperar la conexión Redis
 */
let redisRecoveryAttempts = 0;
const maxRecoveryAttempts = 5;

export const redisRecovery = async (req: Request, res: Response, next: NextFunction) => {
  // Verificar periódicamente e intentar recuperar conexión Redis
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
 * Middleware combinado: Manejo completo de errores y estrategia de degradación para Redis
 */
export const redisResilienceMiddleware = [
  redisHealthCheck,
  redisMonitoring,
  redisRecovery,
];

/**
 * Función factory de middleware de caché
 * Crea middleware de caché para rutas específicas
 */
export const createCacheMiddleware = (options: {
  key?: string | ((req: Request) => string);
  ttl?: number;
  condition?: (req: Request) => boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { key, ttl, condition } = options;

    // Verificar condición
    if (condition && !condition(req)) {
      return next();
    }

    // Generar clave de caché
    const cacheKey = typeof key === 'function' ? key(req) : key || `${req.method}:${req.originalUrl}`;

    try {
      // Intentar obtener datos desde caché
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        logger.debug({ cacheKey }, 'Sirviendo desde caché');

        return res.json({
          ...cached,
          cached: true,
          cachedAt: new Date().toISOString(),
        });
      }

      // Interceptar respuesta para cachear resultado
      const originalJson = res.json;
      res.json = function(body: any) {
        // Solo cachear respuestas exitosas
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, ttl).catch(error => {
            logger.warn({ err: error, cacheKey }, 'Fallo al cachear respuesta');
          });
        }

        return originalJson.call(this, body);
      };

    } catch (error) {
      logger.warn({ err: error, cacheKey }, 'Error en middleware de caché');
      // Continuar procesamiento normal cuando falla el caché
    }

    next();
  };
};
