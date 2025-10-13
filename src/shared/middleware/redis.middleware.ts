// ============================================================================
// REDIS MIDDLEWARE - Redis 錯誤處理和降級策略中介軟體
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { redisService } from '../services/redis.service.js';
import { cacheService } from '../services/cache.service.js';

/**
 * Redis 可用性檢查中介軟體
 * 在請求處理前檢查 Redis 狀態，如果不可用則記錄警告
 */
export const redisHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  // 檢查 Redis 狀態（非阻塞）
  const isRedisAvailable = await redisService.isAvailable().catch(() => false);

  if (!isRedisAvailable) {
    logger.debug('Redis unavailable, using memory cache fallback');
    // 設定請求標記，表示應該使用記憶體快取
    (req as any).useMemoryCache = true;
  }

  next();
};

/**
 * Redis 錯誤處理中介軟體
 * 包裝快取操作，提供統一的錯誤處理和降級策略
 */
export const withRedisFallback = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 如果請求標記為使用記憶體快取，則略過 Redis 操作
      if ((req as any).useMemoryCache) {
        logger.debug(`Skipping Redis ${operation} due to unavailability`);
        return next();
      }

      // 嘗試執行下一個中介軟體或路由處理器
      await next();

    } catch (error) {
      // 檢查是否為 Redis 相關錯誤
      const isRedisError = (error as Error).message?.includes('Redis') ||
                          (error as Error).message?.includes('ECONNREFUSED') ||
                          (error as any).code === 'REDIS_ERROR';

      if (isRedisError) {
        logger.warn({ err: error as Error, operation }, `Redis ${operation} failed, continuing with memory cache`);

        // 設定標記並繼續處理
        (req as any).useMemoryCache = true;

        // 重新執行處理器，這次會使用記憶體快取
        try {
          await next();
        } catch (retryError) {
          logger.error({ err: retryError, operation }, `Memory cache fallback also failed for ${operation}`);
          throw retryError;
        }
      } else {
        // 非 Redis 錯誤，直接拋出
        throw error;
      }
    }
  };
};

/**
 * 快取失效中介軟體
 * 在資料更新後自動失效相關快取
 */
export const invalidateCache = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 先執行實際的請求處理
    await next();

    // 如果請求成功，則失效相關快取
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        for (const pattern of patterns) {
          await cacheService.delete(pattern);
        }

        if (patterns.length > 0) {
          logger.debug({ patterns }, 'Cache invalidated after successful operation');
        }
      } catch (error) {
        // 快取失效失敗不應該影響主要功能
        logger.warn({ err: error, patterns }, 'Failed to invalidate cache patterns');
      }
    }
  };
};

/**
 * Redis 監控中介軟體
 * 記錄快取命中率和效能指標
 */
export const redisMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalJson = res.json;

  // 攔截 JSON 回應來檢查快取狀態
  res.json = function(body: any) {
    const duration = Date.now() - startTime;

    // 檢查回應中是否有快取標記
    if (body?.pagination?.cached === true) {
      logger.debug(
        {
          method: req.method,
          url: req.url,
          cached: true,
          duration: `${duration}ms`
        },
        'Cached response served'
      );
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Redis 錯誤恢復中介軟體
 * 定期嘗試恢復 Redis 連接
 */
let redisRecoveryAttempts = 0;
const maxRecoveryAttempts = 5;

export const redisRecovery = async (req: Request, res: Response, next: NextFunction) => {
  // 定期檢查並嘗試恢復 Redis 連接
  if (redisRecoveryAttempts < maxRecoveryAttempts) {
    try {
      const isAvailable = await redisService.isAvailable();

      if (isAvailable && (req as any).useMemoryCache) {
        logger.info('Redis connection recovered, switching back from memory cache');
        (req as any).useMemoryCache = false;
        redisRecoveryAttempts = 0;
      }
    } catch (error) {
      redisRecoveryAttempts++;
      if (redisRecoveryAttempts >= maxRecoveryAttempts) {
        logger.warn('Max Redis recovery attempts reached');
      }
    }
  }

  next();
};

/**
 * 組合中介軟體：完整的 Redis 錯誤處理和降級策略
 */
export const redisResilienceMiddleware = [
  redisHealthCheck,
  redisMonitoring,
  redisRecovery,
];

/**
 * 快取中介軟體工廠函數
 * 為特定路由創建快取中介軟體
 */
export const createCacheMiddleware = (options: {
  key?: string | ((req: Request) => string);
  ttl?: number;
  condition?: (req: Request) => boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { key, ttl, condition } = options;

    // 檢查條件
    if (condition && !condition(req)) {
      return next();
    }

    // 生成快取鍵
    const cacheKey = typeof key === 'function' ? key(req) : key || `${req.method}:${req.originalUrl}`;

    try {
      // 嘗試從快取獲取資料
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        logger.debug({ cacheKey }, 'Serving from cache');

        return res.json({
          ...cached,
          cached: true,
          cachedAt: new Date().toISOString(),
        });
      }

      // 攔截回應來快取結果
      const originalJson = res.json;
      res.json = function(body: any) {
        // 只有成功回應才快取
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, ttl).catch(error => {
            logger.warn({ err: error, cacheKey }, 'Failed to cache response');
          });
        }

        return originalJson.call(this, body);
      };

    } catch (error) {
      logger.warn({ err: error, cacheKey }, 'Cache middleware error');
      // 快取失敗時繼續正常處理
    }

    next();
  };
};
