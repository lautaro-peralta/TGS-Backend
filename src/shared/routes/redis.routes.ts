// ============================================================================
// REDIS ROUTES - Rutas de operación y monitoreo de Redis
// ============================================================================

import { Router } from 'express';
import { RedisController } from '../controllers/redis.controller.js';

/**
 * Rutas de administración de Redis
 * Nota: Estas rutas deben estar abiertas solo para acceso de administradores
 */
export const redisRouter = Router();
const redisController = new RedisController();

// Obtener estado del servicio Redis
redisRouter.get('/status', redisController.getRedisStatus.bind(redisController));

// Obtener estadísticas del servicio de caché
redisRouter.get('/cache/stats', redisController.getCacheStats.bind(redisController));

// Obtener métricas de rendimiento de caché
redisRouter.get('/cache/metrics', redisController.getCacheMetrics.bind(redisController));

// Obtener uso de memoria de caché
redisRouter.get('/cache/memory', redisController.getMemoryUsage.bind(redisController));

// Limpiar todos los datos de caché
redisRouter.delete('/cache/clear', redisController.clearCache.bind(redisController));

// Probar funcionalidad de caché
redisRouter.post('/cache/test', redisController.testCache.bind(redisController));

// Gestión de claves de caché (obtener, establecer, eliminar)
redisRouter.get('/cache/key/:key', redisController.getCacheKey.bind(redisController));
redisRouter.post('/cache/key/:key', redisController.setCacheKey.bind(redisController));
redisRouter.delete('/cache/key/:key', redisController.deleteCacheKey.bind(redisController));

// Listar claves de caché (soporta coincidencia de patrones)
redisRouter.get('/cache/keys', redisController.listCacheKeys.bind(redisController));
