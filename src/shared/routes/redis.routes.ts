// ============================================================================
// REDIS ROUTES - Redis operation and monitoring routes
// ============================================================================

import { Router } from 'express';
import {
  authMiddleware,
  rolesMiddleware,
} from '../../modules/auth/auth.middleware.js';
import { Role } from '../../modules/auth/user/user.entity.js';
import { RedisController } from '../controllers/redis.controller.js';

/**
 * Redis administration routes
 * Acceso restringido a ADMIN mediante authMiddleware + rolesMiddleware.
 */
export const redisRouter = Router();
const redisController = new RedisController();

// Todas las rutas de abajo son de administración: exponen el contenido de
// la caché y operaciones destructivas, así que exigen sesión y rol ADMIN.
// Va aquí y no en el montaje de app.ts para que la garantía viaje con el
// router y no dependa de cómo se monte.
redisRouter.use(authMiddleware, rolesMiddleware([Role.ADMIN]));

// Get Redis service status
redisRouter.get('/status', redisController.getRedisStatus.bind(redisController));

// Get cache service statistics
redisRouter.get('/cache/stats', redisController.getCacheStats.bind(redisController));

// Get cache performance metrics
redisRouter.get('/cache/metrics', redisController.getCacheMetrics.bind(redisController));

// Get cache memory usage
redisRouter.get('/cache/memory', redisController.getMemoryUsage.bind(redisController));

// Clear all cache data
redisRouter.delete('/cache/clear', redisController.clearCache.bind(redisController));

// Test cache functionality
redisRouter.post('/cache/test', redisController.testCache.bind(redisController));

// Cache key management (get, set, delete)
redisRouter.get('/cache/key/:key', redisController.getCacheKey.bind(redisController));
redisRouter.post('/cache/key/:key', redisController.setCacheKey.bind(redisController));
redisRouter.delete('/cache/key/:key', redisController.deleteCacheKey.bind(redisController));

// List cache keys (supports pattern matching)
redisRouter.get('/cache/keys', redisController.listCacheKeys.bind(redisController));
