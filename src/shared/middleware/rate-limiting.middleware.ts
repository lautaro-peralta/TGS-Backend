// ============================================================================
// DISTRIBUTED RATE LIMITING MIDDLEWARE - 分散式率導限制中介軟體
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { redisService } from '../services/redis.service.js';

/**
 * 滑動視窗率導限制配置
 */
interface SlidingWindowConfig {
  windowMs: number;     // 視窗大小（毫秒）
  maxRequests: number; // 視窗內最大請求數
  keyGenerator?: (req: Request) => string; // 自訂鍵生成器
  skipSuccessfulRequests?: boolean; // 是否略過成功請求
  skipFailedRequests?: boolean;     // 是否略過失敗請求
}

/**
 * 固定視窗率導限制配置
 */
interface FixedWindowConfig {
  windowMs: number;     // 視窗大小（毫秒）
  maxRequests: number; // 視窗內最大請求數
  keyGenerator?: (req: Request) => string; // 自訂鍵生成器
}

/**
 * 令牌桶率導限制配置
 */
interface TokenBucketConfig {
  capacity: number;    // 桶容量
  refillRate: number;  // 每秒補充令牌數
  keyGenerator?: (req: Request) => string; // 自訂鍵生成器
}

/**
 * 滑動視窗率導限制中介軟體
 * 使用 Redis 實現分散式滑動視窗率導限制
 */
export const slidingWindowRateLimit = (config: SlidingWindowConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // 取得當前視窗內的所有請求時間戳
      const requestTimes = await redisService.listRange(key, 0, -1);

      // 過濾出在當前視窗內的請求
      const validRequests = requestTimes.filter((timestamp: string) => {
        const time = parseInt(timestamp);
        return time > windowStart;
      });

      // 檢查是否超過限制
      if (validRequests.length >= config.maxRequests) {
        logger.warn(
          {
            ip: req.ip,
            key,
            requestCount: validRequests.length,
            limit: config.maxRequests,
            windowMs: config.windowMs,
          },
          'Sliding window rate limit exceeded'
        );

        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(config.windowMs / 1000),
          requestId: req.requestId,
        });
      }

      // 添加當前請求時間戳
      await redisService.listPush(key, now.toString());

      // 設定過期時間為視窗大小
      await redisService.getClient().then(client =>
        client.expire(key, Math.ceil(config.windowMs / 1000))
      );

      // 設定剩餘請求數的標頭
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - validRequests.length - 1).toString(),
        'X-RateLimit-Reset': Math.ceil((now + config.windowMs) / 1000).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Sliding window rate limit error');
      // 如果 Redis 錯誤，允許請求繼續（降級策略）
      next();
    }
  };
};

/**
 * 固定視窗率導限制中介軟體
 * 使用 Redis 實現分散式固定視窗率導限制
 */
export const fixedWindowRateLimit = (config: FixedWindowConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now();
      const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;

      // 取得當前視窗的請求計數
      const currentCount = await redisService.get(windowKey);

      if (currentCount && parseInt(currentCount) >= config.maxRequests) {
        logger.warn(
          {
            ip: req.ip,
            key: windowKey,
            requestCount: currentCount,
            limit: config.maxRequests,
          },
          'Fixed window rate limit exceeded'
        );

        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(config.windowMs / 1000),
          requestId: req.requestId,
        });
      }

      // 遞增計數器並設定過期時間
      const newCount = await redisService.increment(windowKey, 1);

      if (newCount === 1) {
        // 第一次設定這個視窗，設定過期時間
        await redisService.getClient().then(client =>
          client.expire(windowKey, Math.ceil(config.windowMs / 1000))
        );
      }

      // 設定標頭
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - (newCount || 0)).toString(),
        'X-RateLimit-Reset': Math.ceil((now + config.windowMs) / 1000).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Fixed window rate limit error');
      // 如果 Redis 錯誤，允許請求繼續（降級策略）
      next();
    }
  };
};

/**
 * 令牌桶率導限制中介軟體
 * 使用 Redis 實現分散式令牌桶率導限制
 */
export const tokenBucketRateLimit = (config: TokenBucketConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now() / 1000; // 轉換為秒

      // 取得當前令牌桶狀態
      const bucketKey = `${key}:bucket`;
      const lastRefillKey = `${key}:lastRefill`;

      const bucketData = await redisService.mget([bucketKey, lastRefillKey]);
      let tokens = bucketData[0] ? parseFloat(bucketData[0]) : config.capacity;
      let lastRefill = bucketData[1] ? parseFloat(bucketData[1]) : now;

      // 計算應該補充的令牌數量
      const timePassed = now - lastRefill;
      const tokensToAdd = Math.floor(timePassed * config.refillRate);

      // 更新令牌數量（不超過容量）
      tokens = Math.min(config.capacity, tokens + tokensToAdd);

      // 檢查是否有足夠的令牌
      if (tokens < 1) {
        logger.warn(
          {
            ip: req.ip,
            key,
            tokens,
            capacity: config.capacity,
            refillRate: config.refillRate,
          },
          'Token bucket rate limit exceeded'
        );

        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(1 / config.refillRate),
          requestId: req.requestId,
        });
      }

      // 消耗一個令牌並更新狀態
      tokens -= 1;
      await redisService.mset([
        { key: bucketKey, value: tokens.toString() },
        { key: lastRefillKey, value: now.toString() },
      ]);

      // 設定標頭
      res.set({
        'X-RateLimit-Limit': config.capacity.toString(),
        'X-RateLimit-Remaining': Math.floor(tokens).toString(),
        'X-RateLimit-Reset': Math.ceil(now + (1 / config.refillRate)).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Token bucket rate limit error');
      // 如果 Redis 錯誤，允許請求繼續（降級策略）
      next();
    }
  };
};

/**
 * 智慧型率導限制中介軟體
 * 根據不同請求類型自動選擇最適合的率導限制策略
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

    // 根據路徑和方法選擇適當的率導限制策略
    if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
      // 認證相關請求使用嚴格的滑動視窗限制
      return slidingWindowRateLimit(config.auth || {
        windowMs: 15 * 60 * 1000, // 15分鐘
        maxRequests: 5, // 每15分鐘最多5個請求
      })(req, res, next);

    } else if (path.startsWith('/api/admin') || path.includes('/users')) {
      // 管理相關請求使用固定視窗限制
      return fixedWindowRateLimit(config.admin || {
        windowMs: 60 * 60 * 1000, // 1小時
        maxRequests: 100, // 每小時最多100個請求
      })(req, res, next);

    } else if (method === 'POST' && (path.includes('/upload') || path.includes('/import'))) {
      // 上傳相關請求使用令牌桶限制
      return tokenBucketRateLimit(config.upload || {
        capacity: 10, // 桶容量為10個請求
        refillRate: 0.1, // 每秒補充0.1個令牌（每10秒補充1個）
      })(req, res, next);

    } else {
      // 一般 API 請求使用預設滑動視窗限制
      return slidingWindowRateLimit(config.default || config.api || {
        windowMs: 15 * 60 * 1000, // 15分鐘
        maxRequests: 100, // 每15分鐘最多100個請求
      })(req, res, next);
    }
  };
};

/**
 * 自訂鍵生成器範例
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
 * 預設鍵生成器
 */
function getDefaultKey(req: Request): string {
  return `rate_limit:${req.ip}:${req.method}:${req.path}`;
}

/**
 * 清理過期的率導限制資料
 * 建議定期執行此函數來清理舊的率導限制資料
 */
export const cleanupRateLimitData = async (): Promise<void> => {
  try {
    logger.info('Starting rate limit data cleanup');

    // 這裡可以實作清理邏輯
    // 例如：刪除超過一定時間的舊鍵

    logger.info('Rate limit data cleanup completed');
  } catch (error) {
    logger.error({ err: error }, 'Rate limit data cleanup failed');
  }
};
