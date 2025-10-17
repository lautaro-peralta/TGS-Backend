// ============================================================================
// REDIS CONTROLLER - Redis 運維和監控控制器
// ============================================================================

import { Request, Response } from 'express';
import { redisService } from '../services/redis.service.js';
import { cacheService } from '../services/cache.service.js';
import { ResponseUtil } from '../utils/response.util.js';
import logger from '../utils/logger.js';

/**
 * Redis 管理控制器
 * 提供 Redis 和快取服務的運維和監控功能
 */
export class RedisController {

  /**
   * 取得 Redis 服務狀態
   */
  async getRedisStatus(req: Request, res: Response) {
    try {
      const isAvailable = await redisService.isAvailable();
      const stats = isAvailable ? await redisService.getStats() : null;

      return ResponseUtil.success(res, 'Redis status retrieved successfully', {
        available: isAvailable,
        stats,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting Redis status');
      return ResponseUtil.internalError(res, 'Error getting Redis status', error);
    }
  }

  /**
   * 取得快取服務統計資訊
   */
  async getCacheStats(req: Request, res: Response) {
    try {
      const stats = await cacheService.getStats();

      return ResponseUtil.success(res, 'Cache statistics retrieved successfully', stats);
    } catch (error) {
      logger.error({ err: error }, 'Error getting cache statistics');
      return ResponseUtil.internalError(res, 'Error getting cache statistics', error);
    }
  }

  /**
   * 清除所有快取資料
   */
  async clearCache(req: Request, res: Response) {
    try {
      const success = await cacheService.clear();

      if (success) {
        logger.info({ admin: (req as any).user?.id }, 'Cache cleared by admin');
        return ResponseUtil.success(res, 'Cache cleared successfully');
      } else {
        return ResponseUtil.error(res, 'Failed to clear cache', 500);
      }
    } catch (error) {
      logger.error({ err: error }, 'Error clearing cache');
      return ResponseUtil.internalError(res, 'Error clearing cache', error);
    }
  }

  /**
   * 取得特定快取鍵的值
   */
  async getCacheKey(req: Request, res: Response) {
    try {
      const { key } = req.params;

      if (!key) {
        return ResponseUtil.validationError(res, 'Cache key is required', [
          { field: 'key', message: 'Cache key parameter is required' }
        ]);
      }

      const value = await cacheService.get(key);

      if (value === null) {
        return ResponseUtil.notFound(res, 'Cache key', key);
      }

      return ResponseUtil.success(res, 'Cache key retrieved successfully', {
        key,
        value,
        type: typeof value,
      });
    } catch (error) {
      logger.error({ err: error, key: req.params.key }, 'Error getting cache key');
      return ResponseUtil.internalError(res, 'Error getting cache key', error);
    }
  }

  /**
   * 設定快取鍵值
   */
  async setCacheKey(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value, ttl } = req.body;

      if (!key || value === undefined) {
        return ResponseUtil.validationError(res, 'Key and value are required', [
          { field: 'key', message: 'Cache key is required' },
          { field: 'value', message: 'Cache value is required' }
        ]);
      }

      const success = await cacheService.set(key, value, ttl);

      if (success) {
        logger.info({ admin: (req as any).user?.id, key, ttl }, 'Cache key set by admin');
        return ResponseUtil.success(res, 'Cache key set successfully');
      } else {
        return ResponseUtil.error(res, 'Failed to set cache key', 500);
      }
    } catch (error) {
      logger.error({ err: error, key: req.params.key }, 'Error setting cache key');
      return ResponseUtil.internalError(res, 'Error setting cache key', error);
    }
  }

  /**
   * 刪除特定快取鍵
   */
  async deleteCacheKey(req: Request, res: Response) {
    try {
      const { key } = req.params;

      if (!key) {
        return ResponseUtil.validationError(res, 'Cache key is required', [
          { field: 'key', message: 'Cache key parameter is required' }
        ]);
      }

      const success = await cacheService.delete(key);

      if (success) {
        logger.info({ admin: (req as any).user?.id, key }, 'Cache key deleted by admin');
        return ResponseUtil.success(res, 'Cache key deleted successfully');
      } else {
        return ResponseUtil.notFound(res, 'Cache key', key);
      }
    } catch (error) {
      logger.error({ err: error, key: req.params.key }, 'Error deleting cache key');
      return ResponseUtil.internalError(res, 'Error deleting cache key', error);
    }
  }

  /**
   * 取得快取鍵列表（支援模式匹配）
   */
  async listCacheKeys(req: Request, res: Response) {
    try {
      const { pattern = '*', limit = 100 } = req.query;

      // 注意：這是一個簡化的實現
      // 在生產環境中，您可能需要實作一個更複雜的鍵列舉機制
      logger.warn({ pattern, limit }, 'Cache key listing requested - this is a simplified implementation');

      return ResponseUtil.success(res, 'Cache key listing completed', {
        pattern,
        limit: Number(limit),
        note: 'This is a simplified implementation. Consider implementing a more sophisticated key enumeration mechanism for production.',
        availableKeys: 0, // 這裡應該實作實際的鍵列舉邏輯
      });
    } catch (error) {
      logger.error({ err: error, pattern: req.query.pattern }, 'Error listing cache keys');
      return ResponseUtil.internalError(res, 'Error listing cache keys', error);
    }
  }

  /**
   * 取得快取效能指標
   */
  async getCacheMetrics(req: Request, res: Response) {
    try {
      const stats = await cacheService.getStats();
      const redisStats = stats.redis.connected ? await redisService.getStats() : null;

      // 計算快取命中率（如果有相關指標的話）
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

      return ResponseUtil.success(res, 'Cache metrics retrieved successfully', metrics);
    } catch (error) {
      logger.error({ err: error }, 'Error getting cache metrics');
      return ResponseUtil.internalError(res, 'Error getting cache metrics', error);
    }
  }

  /**
   * 測試快取功能
   */
  async testCache(req: Request, res: Response) {
    try {
      const { key = 'test', value = 'test_value', ttl = 60 } = req.body;

      // 設定測試資料
      const setSuccess = await cacheService.set(key, value, ttl);

      if (!setSuccess) {
        return ResponseUtil.error(res, 'Failed to set test cache data', 500);
      }

      // 立即讀取測試資料
      const retrievedValue = await cacheService.get(key);

      if (retrievedValue !== value) {
        return ResponseUtil.error(res, 'Cache test failed: retrieved value does not match', 500);
      }

      // 刪除測試資料
      const deleteSuccess = await cacheService.delete(key);

      return ResponseUtil.success(res, 'Cache test completed successfully', {
        setSuccess,
        retrievedValue,
        deleteSuccess,
        testKey: key,
        testValue: value,
        testTtl: ttl,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error testing cache');
      return ResponseUtil.internalError(res, 'Error testing cache', error);
    }
  }

  /**
   * 取得快取記憶體使用情況
   */
  async getMemoryUsage(req: Request, res: Response) {
    try {
      const stats = await cacheService.getStats();

      // 取得 Redis 記憶體統計（如果可用）
      let redisMemoryInfo = null;
      if (stats.redis.connected) {
        try {
          const redisStats = await redisService.getStats();
          redisMemoryInfo = redisStats.memory;
        } catch (error) {
          logger.warn({ err: error }, 'Failed to get Redis memory stats');
        }
      }

      return ResponseUtil.success(res, 'Memory usage retrieved successfully', {
        memoryCache: {
          entries: stats.memory.entries,
          maxEntries: stats.memory.maxEntries,
          utilizationPercent: Math.round((stats.memory.entries / stats.memory.maxEntries) * 100),
        },
        redis: redisMemoryInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting memory usage');
      return ResponseUtil.internalError(res, 'Error getting memory usage', error);
    }
  }
}
