// ============================================================================
// REDIS ROUTES - Redis 運維和監控路由
// ============================================================================

import { Router } from 'express';
import { RedisController } from '../controllers/redis.controller.js';

/**
 * Redis 管理路由
 * 注意：這些路由應該只對管理員開放訪問
 */
export const redisRouter = Router();
const redisController = new RedisController();

// 取得 Redis 服務狀態
redisRouter.get('/status', redisController.getRedisStatus.bind(redisController));

// 取得快取服務統計資訊
redisRouter.get('/cache/stats', redisController.getCacheStats.bind(redisController));

// 取得快取效能指標
redisRouter.get('/cache/metrics', redisController.getCacheMetrics.bind(redisController));

// 取得快取記憶體使用情況
redisRouter.get('/cache/memory', redisController.getMemoryUsage.bind(redisController));

// 清除所有快取資料
redisRouter.delete('/cache/clear', redisController.clearCache.bind(redisController));

// 測試快取功能
redisRouter.post('/cache/test', redisController.testCache.bind(redisController));

// 快取鍵管理（取得、設定、刪除）
redisRouter.get('/cache/key/:key', redisController.getCacheKey.bind(redisController));
redisRouter.post('/cache/key/:key', redisController.setCacheKey.bind(redisController));
redisRouter.delete('/cache/key/:key', redisController.deleteCacheKey.bind(redisController));

// 列出快取鍵（支援模式匹配）
redisRouter.get('/cache/keys', redisController.listCacheKeys.bind(redisController));
