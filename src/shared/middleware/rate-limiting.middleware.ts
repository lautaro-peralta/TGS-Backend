// ============================================================================
// DISTRIBUTED RATE LIMITING MIDDLEWARE - Middleware de limitación de tasa distribuida
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { redisService } from '../services/redis.service.js';

/**
 * Configuración de limitación de tasa con ventana deslizante
 */
interface SlidingWindowConfig {
  windowMs: number;     // Tamaño de ventana (milisegundos)
  maxRequests: number; // Número máximo de solicitudes en la ventana
  keyGenerator?: (req: Request) => string; // Generador de clave personalizado
  skipSuccessfulRequests?: boolean; // Si omitir solicitudes exitosas
  skipFailedRequests?: boolean;     // Si omitir solicitudes fallidas
}

/**
 * Configuración de limitación de tasa con ventana fija
 */
interface FixedWindowConfig {
  windowMs: number;     // Tamaño de ventana (milisegundos)
  maxRequests: number; // Número máximo de solicitudes en la ventana
  keyGenerator?: (req: Request) => string; // Generador de clave personalizado
}

/**
 * Configuración de limitación de tasa con bucket de tokens
 */
interface TokenBucketConfig {
  capacity: number;    // Capacidad del bucket
  refillRate: number;  // Número de tokens recargados por segundo
  keyGenerator?: (req: Request) => string; // Generador de clave personalizado
}

/**
 * Middleware de limitación de tasa con ventana deslizante
 * Implementa limitación de tasa con ventana deslizante distribuida usando Redis
 */
export const slidingWindowRateLimit = (config: SlidingWindowConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Obtener todas las marcas de tiempo de solicitudes en la ventana actual
      const requestTimes = await redisService.listRange(key, 0, -1);

      // Filtrar solicitudes que están en la ventana actual
      const validRequests = requestTimes.filter((timestamp: string) => {
        const time = parseInt(timestamp);
        return time > windowStart;
      });

      // Verificar si se excede el límite
      if (validRequests.length >= config.maxRequests) {
        logger.warn(
          {
            ip: req.ip,
            key,
            requestCount: validRequests.length,
            limit: config.maxRequests,
            windowMs: config.windowMs,
          },
          'Límite de tasa con ventana deslizante excedido'
        );

        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes, por favor intente más tarde',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(config.windowMs / 1000),
          requestId: req.requestId,
        });
      }

      // Agregar marca de tiempo de solicitud actual
      await redisService.listPush(key, now.toString());

      // Establecer tiempo de expiración como tamaño de ventana
      await redisService.getClient().then(client =>
        client.expire(key, Math.ceil(config.windowMs / 1000))
      );

      // Establecer encabezados de solicitudes restantes
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - validRequests.length - 1).toString(),
        'X-RateLimit-Reset': Math.ceil((now + config.windowMs) / 1000).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Error en limitación de tasa con ventana deslizante');
      // Si hay error de Redis, permitir que la solicitud continúe (estrategia de degradación)
      next();
    }
  };
};

/**
 * Middleware de limitación de tasa con ventana fija
 * Implementa limitación de tasa con ventana fija distribuida usando Redis
 */
export const fixedWindowRateLimit = (config: FixedWindowConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now();
      const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;

      // Obtener contador de solicitudes de la ventana actual
      const currentCount = await redisService.get(windowKey);

      if (currentCount && parseInt(currentCount) >= config.maxRequests) {
        logger.warn(
          {
            ip: req.ip,
            key: windowKey,
            requestCount: currentCount,
            limit: config.maxRequests,
          },
          'Límite de tasa con ventana fija excedido'
        );

        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes, por favor intente más tarde',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(config.windowMs / 1000),
          requestId: req.requestId,
        });
      }

      // Incrementar contador y establecer tiempo de expiración
      const newCount = await redisService.increment(windowKey, 1);

      if (newCount === 1) {
        // Primera vez estableciendo esta ventana, establecer tiempo de expiración
        await redisService.getClient().then(client =>
          client.expire(windowKey, Math.ceil(config.windowMs / 1000))
        );
      }

      // Establecer encabezados
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - (newCount || 0)).toString(),
        'X-RateLimit-Reset': Math.ceil((now + config.windowMs) / 1000).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Error en limitación de tasa con ventana fija');
      // Si hay error de Redis, permitir que la solicitud continúe (estrategia de degradación)
      next();
    }
  };
};

/**
 * Middleware de limitación de tasa con bucket de tokens
 * Implementa limitación de tasa con bucket de tokens distribuida usando Redis
 */
export const tokenBucketRateLimit = (config: TokenBucketConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now() / 1000; // Convertir a segundos

      // Obtener estado actual del bucket de tokens
      const bucketKey = `${key}:bucket`;
      const lastRefillKey = `${key}:lastRefill`;

      const bucketData = await redisService.mget([bucketKey, lastRefillKey]);
      let tokens = bucketData[0] ? parseFloat(bucketData[0]) : config.capacity;
      let lastRefill = bucketData[1] ? parseFloat(bucketData[1]) : now;

      // Calcular número de tokens a recargar
      const timePassed = now - lastRefill;
      const tokensToAdd = Math.floor(timePassed * config.refillRate);

      // Actualizar número de tokens (no exceder capacidad)
      tokens = Math.min(config.capacity, tokens + tokensToAdd);

      // Verificar si hay suficientes tokens
      if (tokens < 1) {
        logger.warn(
          {
            ip: req.ip,
            key,
            tokens,
            capacity: config.capacity,
            refillRate: config.refillRate,
          },
          'Límite de tasa con bucket de tokens excedido'
        );

        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes, por favor intente más tarde',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(1 / config.refillRate),
          requestId: req.requestId,
        });
      }

      // Consumir un token y actualizar estado
      tokens -= 1;
      await redisService.mset([
        { key: bucketKey, value: tokens.toString() },
        { key: lastRefillKey, value: now.toString() },
      ]);

      // Establecer encabezados
      res.set({
        'X-RateLimit-Limit': config.capacity.toString(),
        'X-RateLimit-Remaining': Math.floor(tokens).toString(),
        'X-RateLimit-Reset': Math.ceil(now + (1 / config.refillRate)).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Error en limitación de tasa con bucket de tokens');
      // Si hay error de Redis, permitir que la solicitud continúe (estrategia de degradación)
      next();
    }
  };
};

/**
 * Middleware de limitación de tasa inteligente
 * Selecciona automáticamente la estrategia de limitación de tasa más adecuada según el tipo de solicitud
 */
export const intelligentRateLimit = (config: {
  default?: SlidingWindowConfig;
  auth?: SlidingWindowConfig;
  api?: SlidingWindowConfig;
  admin?: FixedWindowConfig;
  upload?: TokenBucketConfig;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    const method = req.method;

    // Seleccionar estrategia de limitación de tasa apropiada según ruta y método
    if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
      // Solicitudes relacionadas con autenticación usan limitación estricta con ventana deslizante
      return slidingWindowRateLimit(config.auth || {
        windowMs: 15 * 60 * 1000, // 15 minutos
        maxRequests: 5, // Máximo 5 solicitudes por 15 minutos
      })(req, res, next);

    } else if (path.startsWith('/api/admin') || path.includes('/users')) {
      // Solicitudes relacionadas con administración usan limitación con ventana fija
      return fixedWindowRateLimit(config.admin || {
        windowMs: 60 * 60 * 1000, // 1 hora
        maxRequests: 100, // Máximo 100 solicitudes por hora
      })(req, res, next);

    } else if (method === 'POST' && (path.includes('/upload') || path.includes('/import'))) {
      // Solicitudes relacionadas con carga usan limitación con bucket de tokens
      return tokenBucketRateLimit(config.upload || {
        capacity: 10, // Capacidad del bucket: 10 solicitudes
        refillRate: 0.1, // Recargar 0.1 tokens por segundo (1 token cada 10 segundos)
      })(req, res, next);

    } else {
      // Solicitudes API generales usan limitación predeterminada con ventana deslizante
      return slidingWindowRateLimit(config.default || config.api || {
        windowMs: 15 * 60 * 1000, // 15 minutos
        maxRequests: 100, // Máximo 100 solicitudes por 15 minutos
      })(req, res, next);
    }
  };
};

/**
 * Ejemplo de generador de clave personalizado
 */
export const createKeyGenerator = (prefix: string, includeUser: boolean = false) => {
  return (req: Request) => {
    let key = `${prefix}:${req.ip}`;

    if (includeUser && (req as any).user?.id) {
      key += `:${(req as any).user.id}`;
    }

    return key;
  };
};

/**
 * Generador de clave predeterminado
 */
function getDefaultKey(req: Request): string {
  return `rate_limit:${req.ip}:${req.method}:${req.path}`;
}

/**
 * Limpieza de datos de limitación de tasa expirados
 * Se recomienda ejecutar esta función periódicamente para limpiar datos antiguos de limitación de tasa
 */
export const cleanupRateLimitData = async (): Promise<void> => {
  try {
    logger.info('Iniciando limpieza de datos de limitación de tasa');

    // Aquí se puede implementar la lógica de limpieza
    // Por ejemplo: eliminar claves antiguas que exceden cierto tiempo

    logger.info('Limpieza de datos de limitación de tasa completada');
  } catch (error) {
    logger.error({ err: error }, 'Fallo en limpieza de datos de limitación de tasa');
  }
};
