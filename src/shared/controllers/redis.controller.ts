// ============================================================================
// REDIS CONTROLLER - Redis operation and monitoring controller
// ============================================================================

import { Request, Response } from 'express';
import { redisService } from '../services/redis.service.js';
import { cacheService } from '../services/cache.service.js';
import { ResponseUtil } from '../utils/response.util.js';
import logger from '../utils/logger.js';

/**
 * Redis administration controller
 * Provides operation and monitoring functionality for Redis and cache services
 */
export class RedisController {

  /**
   * Get Redis service status
   */
  async getRedisStatus(req: Request, res: Response) {
    try {
      const isAvailable = await redisService.isAvailable();
      const stats = isAvailable ? await redisService.getStats() : null;

      return ResponseUtil.success(res, 'Estado de Redis obtenido exitosamente', {
        available: isAvailable,
        stats,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener estado de Redis');
      return ResponseUtil.internalError(res, 'Error al obtener estado de Redis', error);
    }
  }

  /**
   * Get cache service statistics
   */
  async getCacheStats(req: Request, res: Response) {
    try {
      const stats = await cacheService.getStats();

      return ResponseUtil.success(res, 'Estadísticas de caché obtenidas exitosamente', stats);
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener estadísticas de caché');
      return ResponseUtil.internalError(res, 'Error al obtener estadísticas de caché', error);
    }
  }

  /**
   * Clear all cache data
   */
  async clearCache(req: Request, res: Response) {
    try {
      const success = await cacheService.clear();

      if (success) {
        logger.info({ admin: (req as any).user?.id }, 'Caché limpiado por administrador');
        return ResponseUtil.success(res, 'Caché limpiado exitosamente');
      } else {
        return ResponseUtil.error(res, 'Fallo al limpiar caché', 500);
      }
    } catch (error) {
      logger.error({ err: error }, 'Error al limpiar caché');
      return ResponseUtil.internalError(res, 'Error al limpiar caché', error);
    }
  }

  /**
   * Get specific cache key value
   */
  async getCacheKey(req: Request, res: Response) {
    try {
      const { key } = req.params;

      if (!key) {
        return ResponseUtil.validationError(res, 'Se requiere clave de caché', [
          { field: 'key', message: 'Se requiere parámetro de clave de caché' }
        ]);
      }

      const value = await cacheService.get(key);

      if (value === null) {
        return ResponseUtil.notFound(res, 'Clave de caché', key);
      }

      return ResponseUtil.success(res, 'Clave de caché obtenida exitosamente', {
        key,
        value,
        type: typeof value,
      });
    } catch (error) {
      logger.error({ err: error, key: req.params.key }, 'Error al obtener clave de caché');
      return ResponseUtil.internalError(res, 'Error al obtener clave de caché', error);
    }
  }

  /**
   * Set cache key
   */
  async setCacheKey(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value, ttl } = req.body;

      if (!key || value === undefined) {
        return ResponseUtil.validationError(res, 'Se requieren clave y valor', [
          { field: 'key', message: 'Se requiere clave de caché' },
          { field: 'value', message: 'Se requiere valor de caché' }
        ]);
      }

      const success = await cacheService.set(key, value, ttl);

      if (success) {
        logger.info({ admin: (req as any).user?.id, key, ttl }, 'Clave de caché establecida por administrador');
        return ResponseUtil.success(res, 'Clave de caché establecida exitosamente');
      } else {
        return ResponseUtil.error(res, 'Fallo al establecer clave de caché', 500);
      }
    } catch (error) {
      logger.error({ err: error, key: req.params.key }, 'Error al establecer clave de caché');
      return ResponseUtil.internalError(res, 'Error al establecer clave de caché', error);
    }
  }

  /**
   * Delete specific cache key
   */
  async deleteCacheKey(req: Request, res: Response) {
    try {
      const { key } = req.params;

      if (!key) {
        return ResponseUtil.validationError(res, 'Se requiere clave de caché', [
          { field: 'key', message: 'Se requiere parámetro de clave de caché' }
        ]);
      }

      const success = await cacheService.delete(key);

      if (success) {
        logger.info({ admin: (req as any).user?.id, key }, 'Clave de caché eliminada por administrador');
        return ResponseUtil.success(res, 'Clave de caché eliminada exitosamente');
      } else {
        return ResponseUtil.notFound(res, 'Clave de caché', key);
      }
    } catch (error) {
      logger.error({ err: error, key: req.params.key }, 'Error al eliminar clave de caché');
      return ResponseUtil.internalError(res, 'Error al eliminar clave de caché', error);
    }
  }

  /**
   * Get list of cache keys (supports pattern matching)
   */
  async listCacheKeys(req: Request, res: Response) {
    try {
      const { pattern = '*', limit = 100 } = req.query;

      // Note: This is a simplified implementation
      // In production environment, you may need to implement a more complex key enumeration mechanism
      logger.warn({ pattern, limit }, 'Listado de claves de caché solicitado - esta es una implementación simplificada');

      return ResponseUtil.success(res, 'Listado de claves de caché completado', {
        pattern,
        limit: Number(limit),
        note: 'Esta es una implementación simplificada. Considere implementar un mecanismo de enumeración de claves más sofisticado para producción.',
        availableKeys: 0, // Here should be implemented the real key enumeration logic
      });
    } catch (error) {
      logger.error({ err: error, pattern: req.query.pattern }, 'Error al listar claves de caché');
      return ResponseUtil.internalError(res, 'Error al listar claves de caché', error);
    }
  }

  /**
   * Get cache performance metrics
   */
  async getCacheMetrics(req: Request, res: Response) {
    try {
      const stats = await cacheService.getStats();
      const redisStats = stats.redis.connected ? await redisService.getStats() : null;

      // Calculate cache hit rate (if metrics available)
      const metrics = {
        redis: {
          connected: stats.redis.connected,
          ...redisStats,
        },
        memory: stats.memory,
        configuration: {
          ttl: stats.ttl,
        },
        timestamp: new Date().toISOString(),
      };

      return ResponseUtil.success(res, 'Métricas de caché obtenidas exitosamente', metrics);
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener métricas de caché');
      return ResponseUtil.internalError(res, 'Error al obtener métricas de caché', error);
    }
  }

  /**
   * Test cache functionality
   */
  async testCache(req: Request, res: Response) {
    try {
      const { key = 'test', value = 'test_value', ttl = 60 } = req.body;

      // Set test data
      const setSuccess = await cacheService.set(key, value, ttl);

      if (!setSuccess) {
        return ResponseUtil.error(res, 'Fallo al establecer datos de prueba de caché', 500);
      }

      // Read test data immediately
      const retrievedValue = await cacheService.get(key);

      if (retrievedValue !== value) {
        return ResponseUtil.error(res, 'Prueba de caché falló: el valor recuperado no coincide', 500);
      }

      // Delete test data
      const deleteSuccess = await cacheService.delete(key);

      return ResponseUtil.success(res, 'Prueba de caché completada exitosamente', {
        setSuccess,
        retrievedValue,
        deleteSuccess,
        testKey: key,
        testValue: value,
        testTtl: ttl,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error al probar caché');
      return ResponseUtil.internalError(res, 'Error al probar caché', error);
    }
  }

  /**
   * Get cache memory usage
   */
  async getMemoryUsage(req: Request, res: Response) {
    try {
      const stats = await cacheService.getStats();

      // Get Redis memory statistics (if available)
      let redisMemoryInfo = null;
      if (stats.redis.connected) {
        try {
          const redisStats = await redisService.getStats();
          redisMemoryInfo = redisStats.memory;
        } catch (error) {
          logger.warn({ err: error }, 'Fallo al obtener estadísticas de memoria de Redis');
        }
      }

      return ResponseUtil.success(res, 'Uso de memoria obtenido exitosamente', {
        memoryCache: {
          entries: stats.memory.entries,
          maxEntries: stats.memory.maxEntries,
          utilizationPercent: Math.round((stats.memory.entries / stats.memory.maxEntries) * 100),
        },
        redis: redisMemoryInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener uso de memoria');
      return ResponseUtil.internalError(res, 'Error al obtener uso de memoria', error);
    }
  }
}
