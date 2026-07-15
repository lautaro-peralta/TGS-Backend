// ============================================================================
// REDIS ROUTES - Redis operation and monitoring routes
// ============================================================================

import { Router } from 'express';
import { RedisController } from '../controllers/redis.controller.js';
import {
  authMiddleware,
  rolesMiddleware,
} from '../../modules/auth/auth.middleware.js';
import { Role } from '../../modules/auth/user/user.entity.js';

/**
 * Redis administration routes
 *
 * SECURITY: These endpoints expose and mutate cache internals (clearing the
 * cache, reading/writing/deleting arbitrary keys). They must only be reachable
 * by authenticated administrators. The guard is applied at the router level so
 * the protection travels with the router regardless of where it is mounted and
 * cannot be accidentally bypassed by a future route being added below.
 */
export const redisRouter = Router();
const redisController = new RedisController();

// Require an authenticated ADMIN for every route in this router
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
