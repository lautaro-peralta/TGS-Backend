// ============================================================================
// REDIS ROUTES - Redis operation and monitoring routes
// ============================================================================

import { Router } from 'express';
import { RedisController } from '../controllers/redis.controller.js';

/**
 * Redis administration routes
 * Note: These routes should be open only for administrator access
 */
export const redisRouter = Router();
const redisController = new RedisController();

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
