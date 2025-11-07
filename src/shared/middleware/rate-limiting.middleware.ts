// ============================================================================
// DISTRIBUTED RATE LIMITING MIDDLEWARE - Distributed rate limiting middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { redisService } from '../services/redis.service.js';

/**
 * Sliding window rate limiting configuration
 */
interface SlidingWindowConfig {
  windowMs: number;     // Window size (milliseconds)
  maxRequests: number; // Maximum number of requests in the window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Whether to skip successful requests
  skipFailedRequests?: boolean;     // Whether to skip failed requests
}

/**
 * Fixed window rate limiting configuration
 */
interface FixedWindowConfig {
  windowMs: number;     // Window size (milliseconds)
  maxRequests: number; // Maximum number of requests in the window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

/**
 * Token bucket rate limiting configuration
 */
interface TokenBucketConfig {
  capacity: number;    // Bucket capacity
  refillRate: number;  // Number of tokens refilled per second
  keyGenerator?: (req: Request) => string; // Custom key generator
}

/**
 * Sliding window rate limiting middleware
 * Implements distributed sliding window rate limiting using Redis
 */
export const slidingWindowRateLimit = (config: SlidingWindowConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get all request timestamps in the current window
      const requestTimes = await redisService.listRange(key, 0, -1);

      // Filter requests that are in the current window
      const validRequests = requestTimes.filter((timestamp: string) => {
        const time = parseInt(timestamp);
        return time > windowStart;
      });

      // Check if the limit is exceeded
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

      // Add current request timestamp
      await redisService.listPush(key, now.toString());

      // Set expiration time to window size
      await redisService.getClient().then(client =>
        client.expire(key, Math.ceil(config.windowMs / 1000))
      );

      // Set remaining requests headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - validRequests.length - 1).toString(),
        'X-RateLimit-Reset': Math.ceil((now + config.windowMs) / 1000).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Error in sliding window rate limiting');
      // If there's a Redis error, allow the request to continue (degradation strategy)
      next();
    }
  };
};

/**
 * Fixed window rate limiting middleware
 * Implements distributed fixed window rate limiting using Redis
 */
export const fixedWindowRateLimit = (config: FixedWindowConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now();
      const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;

      // Get request counter from the current window
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

      // Increment counter and set expiration time
      const newCount = await redisService.increment(windowKey, 1);

      if (newCount === 1) {
        // First time setting this window, set expiration time
        await redisService.getClient().then(client =>
          client.expire(windowKey, Math.ceil(config.windowMs / 1000))
        );
      }

      // Set headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - (newCount || 0)).toString(),
        'X-RateLimit-Reset': Math.ceil((now + config.windowMs) / 1000).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Error in fixed window rate limiting');
      // If there's a Redis error, allow the request to continue (degradation strategy)
      next();
    }
  };
};

/**
 * Token bucket rate limiting middleware
 * Implements distributed token bucket rate limiting using Redis
 */
export const tokenBucketRateLimit = (config: TokenBucketConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = Date.now() / 1000; // Convert to seconds

      // Get current token bucket state
      const bucketKey = `${key}:bucket`;
      const lastRefillKey = `${key}:lastRefill`;

      const bucketData = await redisService.mget([bucketKey, lastRefillKey]);
      let tokens = bucketData[0] ? parseFloat(bucketData[0]) : config.capacity;
      let lastRefill = bucketData[1] ? parseFloat(bucketData[1]) : now;

      // Calculate number of tokens to refill
      const timePassed = now - lastRefill;
      const tokensToAdd = Math.floor(timePassed * config.refillRate);

      // Update number of tokens (do not exceed capacity)
      tokens = Math.min(config.capacity, tokens + tokensToAdd);

      // Check if there are enough tokens
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

      // Consume one token and update state
      tokens -= 1;
      await redisService.mset([
        { key: bucketKey, value: tokens.toString() },
        { key: lastRefillKey, value: now.toString() },
      ]);

      // Set headers
      res.set({
        'X-RateLimit-Limit': config.capacity.toString(),
        'X-RateLimit-Remaining': Math.floor(tokens).toString(),
        'X-RateLimit-Reset': Math.ceil(now + (1 / config.refillRate)).toString(),
      });

      next();

    } catch (error) {
      logger.error({ err: error, ip: req.ip }, 'Error in token bucket rate limiting');
      // If there's a Redis error, allow the request to continue (degradation strategy)
      next();
    }
  };
};

/**
 * Intelligent rate limiting middleware
 * Automatically selects the most appropriate rate limiting strategy based on request type
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

    // Select appropriate rate limiting strategy based on route and method
    if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
      // Authentication-related requests use strict sliding window rate limiting
      return slidingWindowRateLimit(config.auth || {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // Maximum 5 requests per 15 minutes
      })(req, res, next);

    } else if (path.startsWith('/api/admin') || path.includes('/users')) {
      // Admin-related requests use fixed window rate limiting
      return fixedWindowRateLimit(config.admin || {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 100, // Maximum 100 requests per hour
      })(req, res, next);

    } else if (method === 'POST' && (path.includes('/upload') || path.includes('/import'))) {
      // Upload-related requests use token bucket rate limiting
      return tokenBucketRateLimit(config.upload || {
        capacity: 10, // Bucket capacity: 10 requests
        refillRate: 0.1, // Refill 0.1 tokens per second (1 token every 10 seconds)
      })(req, res, next);

    } else {
      // General API requests use default sliding window rate limiting
      return slidingWindowRateLimit(config.default || config.api || {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // Maximum 100 requests per 15 minutes
      })(req, res, next);
    }
  };
};

/**
 * Example of custom key generator
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
 * Default key generator
 */
function getDefaultKey(req: Request): string {
  return `rate_limit:${req.ip}:${req.method}:${req.path}`;
}

/**
 * Cleanup of expired rate limiting data
 * It is recommended to run this function periodically to clean up old rate limiting data
 */
export const cleanupRateLimitData = async (): Promise<void> => {
  try {
    logger.info('Starting rate limiting data cleanup');

    // Here you can implement the cleanup logic
    // For example: delete old keys that exceed a certain time

    logger.info('Rate limiting data cleanup completed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to clean up rate limiting data');
  }
};
