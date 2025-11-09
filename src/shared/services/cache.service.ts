// ============================================================================
// CACHE SERVICE - Multi-layer caching service with Redis and fallbacks
// ============================================================================

import { redisService } from './redis.service.js';
import logger from '../utils/logger.js';

/**
 * Configuración de TTL para diferentes tipos de datos
 */
export const CACHE_TTL = {
  // Frequently changing data
  SESSION: 15 * 60, // 15 minutes
  USER_DATA: 30 * 60, // 30 minutes

  // Semi-static data
  PRODUCT_LIST: 60 * 60, // 1 hour
  CLIENT_LIST: 60 * 60, // 1 hour
  AUTHORITY_LIST: 60 * 60, // 1 hour

  // Static or rarely changing data
  ZONE_LIST: 4 * 60 * 60, // 4 hours
  SYSTEM_CONFIG: 24 * 60 * 60, // 24 hours

  // Very static data
  VALIDATION_RULES: 7 * 24 * 60 * 60, // 7 days

  // HTTP response cache
  API_RESPONSE: 5 * 60, // 5 minutes

  // Frequent search cache
  SEARCH_RESULTS: 10 * 60, // 10 minutes

  // Metrics cache
  METRICS: 60, // 1 minute
} as const;

/**
 * Servicio de caching multicapa con estrategias inteligentes
 */
export class CacheService {
  private memoryCache = new Map<string, { value: any; expiry: number; hits: number }>();
  private readonly maxMemoryEntries = 1000;

  /**
   * Obtiene un valor del cache con estrategia de fallback
   */
  async get<T>(key: string): Promise<T | null> {
    // Try to get from Redis first
    try {
      const redisValue = await redisService.get(key);
      if (redisValue) {
        logger.debug({ key, source: 'redis' }, 'Cache hit from Redis');
        return JSON.parse(redisValue) as T;
      }
    } catch (error) {
      logger.warn({ err: error, key }, 'Redis cache miss');
    }

    // Fallback to memory
    const memoryValue = this.getFromMemory<T>(key);
    if (memoryValue !== null) {
      logger.debug({ key, source: 'memory' }, 'Cache hit from memory');
      return memoryValue;
    }

    logger.debug({ key }, 'Cache miss');
    return null;
  }

  /**
   * Establece un valor en el cache multicapa
   */
  async set<T>(key: string, value: T, ttl: number = CACHE_TTL.API_RESPONSE): Promise<boolean> {
    const serializedValue = JSON.stringify(value);

    // Try to set in Redis
    let redisSuccess = false;
    try {
      redisSuccess = await redisService.set(key, serializedValue, ttl);
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to set value in Redis');
    }

    // Always set in memory as fallback
    this.setInMemory(key, value, ttl);

    return redisSuccess;
  }

  /**
   * Establece múltiples valores en el cache
   */
  async mset<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    const redisItems = items.map(item => ({
      key: item.key,
      value: JSON.stringify(item.value),
      ttl: item.ttl || CACHE_TTL.API_RESPONSE,
    }));

    let redisSuccess = false;
    try {
      redisSuccess = await redisService.mset(redisItems);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to set multiple values in Redis');
    }

    // Always set in memory as fallback
    items.forEach(item => {
      this.setInMemory(item.key, item.value, item.ttl || CACHE_TTL.API_RESPONSE);
    });

    return redisSuccess;
  }

  /**
   * Obtiene múltiples valores del cache
   */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    // Try to get from Redis first
    try {
      const redisValues = await redisService.mget(keys);
      const results: Array<T | null> = [];

      for (let i = 0; i < keys.length; i++) {
        if (redisValues[i]) {
          results.push(JSON.parse(redisValues[i]!) as T);
        } else {
          // Fallback to memory for keys not found in Redis
          const memoryValue = this.getFromMemory<T>(keys[i]);
          results.push(memoryValue);
        }
      }

      return results;
    } catch (error) {
      logger.warn({ err: error, keys }, 'Failed to get multiple values from Redis, using memory fallback');

      // Complete fallback to memory
      return keys.map(key => this.getFromMemory(key));
    }
  }

  /**
   * Elimina un valor del cache
   */
  async delete(key: string): Promise<boolean> {
    let success = false;

    // Delete from Redis
    try {
      success = await redisService.delete(key) || success;
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to delete from Redis');
    }

    // Delete from memory
    this.deleteFromMemory(key);

    return success;
  }

  /**
   * Limpia todo el cache
   */
  async clear(): Promise<boolean> {
    let success = false;

    // Clear Redis
    try {
      success = await redisService.flushAll();
    } catch (error) {
      logger.warn({ err: error }, 'Failed to flush Redis');
    }

    // Clear memory
    this.memoryCache.clear();

    return success;
  }

  /**
   * Obtiene estadísticas del cache
   */
  async getStats() {
    const redisAvailable = await redisService.isAvailable();
    const redisStats = redisAvailable ? await redisService.getStats() : null;

    return {
      redis: {
        connected: redisAvailable,
        stats: redisStats,
      },
      memory: {
        entries: this.memoryCache.size,
        maxEntries: this.maxMemoryEntries,
      },
      ttl: CACHE_TTL,
    };
  }

  /**
   * Cache inteligente para consultas de búsqueda frecuentes
   */
  async cacheSearchResults<T>(
    searchKey: string,
    searchFn: () => Promise<T>,
    ttl: number = CACHE_TTL.SEARCH_RESULTS
  ): Promise<T> {
    const cacheKey = `search:${searchKey}`;

    // Check cache
    const cached = await this.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute search and cache result
    const result = await searchFn();
    await this.set(cacheKey, result, ttl);

    return result;
  }

  /**
   * Cache para respuestas API con patrón de claves inteligente
   */
  async cacheApiResponse<T>(
    endpoint: string,
    params: Record<string, any>,
    responseFn: () => Promise<T>,
    ttl: number = CACHE_TTL.API_RESPONSE
  ): Promise<T> {
    // Create cache key based on endpoint and parameters
    const paramsStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(':');

    const cacheKey = `api:${endpoint}:${paramsStr}`;

    return this.cacheSearchResults(cacheKey, responseFn, ttl);
  }

  /**
   * Cache para datos de usuario con invalidación por ID
   */
  async cacheUserData<T>(
    userId: string,
    dataFn: () => Promise<T>,
    ttl: number = CACHE_TTL.USER_DATA
  ): Promise<T> {
    const cacheKey = `user:${userId}`;

    const cached = await this.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await dataFn();
    await this.set(cacheKey, data, ttl);

    return data;
  }

  /**
   * Invalida cache relacionado con un usuario
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}`,
      `session:${userId}`,
      `profile:${userId}`,
    ];

    for (const pattern of patterns) {
      await this.delete(pattern);
    }

    logger.info({ userId, patterns }, 'User cache invalidated');
  }

  /**
   * Invalida cache relacionado con una entidad específica
   */
  async invalidateEntityCache(entityType: string, entityId?: string): Promise<void> {
    const patterns = entityId
      ? [`${entityType}:${entityId}`, `${entityType}:list`]
      : [`${entityType}:*`];

    for (const pattern of patterns) {
      await this.delete(pattern);
    }

    logger.info({ entityType, entityId, patterns }, 'Entity cache invalidated');
  }

  /**
   * Obtiene valor de memoria (método privado)
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    // Increment hit counter
    entry.hits++;

    return entry.value as T;
  }

  /**
   * Establece valor en memoria (método privado)
   */
  private setInMemory<T>(key: string, value: T, ttl: number): void {
    // Clean expired entries if approaching limit
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      this.cleanupExpiredEntries();
    }

    const expiry = Date.now() + (ttl * 1000);

    this.memoryCache.set(key, {
      value,
      expiry,
      hits: 0,
    });
  }

  /**
   * Elimina entrada de memoria (método privado)
   */
  private deleteFromMemory(key: string): void {
    this.memoryCache.delete(key);
  }

  /**
   * Limpia entradas expiradas de memoria (método privado)
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiry) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug({ cleaned }, 'Cleaned expired memory cache entries');
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
