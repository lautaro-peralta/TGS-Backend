// ============================================================================
// CACHE SERVICE - Servicio de caching multicapa con Redis y fallbacks
// ============================================================================

import { redisService } from './redis.service.js';
import logger from '../utils/logger.js';

/**
 * Configuración de TTL para diferentes tipos de datos
 */
export const CACHE_TTL = {
  // Datos que cambian frecuentemente
  SESSION: 15 * 60, // 15 minutos
  USER_DATA: 30 * 60, // 30 minutos

  // Datos semi-estáticos
  PRODUCT_LIST: 60 * 60, // 1 hora
  CLIENT_LIST: 60 * 60, // 1 hora
  AUTHORITY_LIST: 60 * 60, // 1 hora

  // Datos estáticos o que cambian raramente
  ZONE_LIST: 4 * 60 * 60, // 4 horas
  SYSTEM_CONFIG: 24 * 60 * 60, // 24 horas

  // Datos muy estáticos
  VALIDATION_RULES: 7 * 24 * 60 * 60, // 7 días

  // Cache de respuestas HTTP
  API_RESPONSE: 5 * 60, // 5 minutos

  // Cache de búsquedas frecuentes
  SEARCH_RESULTS: 10 * 60, // 10 minutos

  // Cache de métricas
  METRICS: 60, // 1 minuto
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
    // Intentar obtener de Redis primero
    try {
      const redisValue = await redisService.get(key);
      if (redisValue) {
        logger.debug({ key, source: 'redis' }, 'Cache hit from Redis');
        return JSON.parse(redisValue) as T;
      }
    } catch (error) {
      logger.warn({ err: error, key }, 'Redis cache miss');
    }

    // Fallback a memoria
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

    // Intentar establecer en Redis
    let redisSuccess = false;
    try {
      redisSuccess = await redisService.set(key, serializedValue, ttl);
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to set value in Redis');
    }

    // Siempre establecer en memoria como fallback
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

    // Siempre establecer en memoria como fallback
    items.forEach(item => {
      this.setInMemory(item.key, item.value, item.ttl || CACHE_TTL.API_RESPONSE);
    });

    return redisSuccess;
  }

  /**
   * Obtiene múltiples valores del cache
   */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    // Intentar obtener de Redis primero
    try {
      const redisValues = await redisService.mget(keys);
      const results: Array<T | null> = [];

      for (let i = 0; i < keys.length; i++) {
        if (redisValues[i]) {
          results.push(JSON.parse(redisValues[i]!) as T);
        } else {
          // Fallback a memoria para claves no encontradas en Redis
          const memoryValue = this.getFromMemory<T>(keys[i]);
          results.push(memoryValue);
        }
      }

      return results;
    } catch (error) {
      logger.warn({ err: error, keys }, 'Failed to get multiple values from Redis, using memory fallback');

      // Fallback completo a memoria
      return keys.map(key => this.getFromMemory(key));
    }
  }

  /**
   * Elimina un valor del cache
   */
  async delete(key: string): Promise<boolean> {
    let success = false;

    // Eliminar de Redis
    try {
      success = await redisService.delete(key) || success;
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to delete from Redis');
    }

    // Eliminar de memoria
    this.deleteFromMemory(key);

    return success;
  }

  /**
   * Limpia todo el cache
   */
  async clear(): Promise<boolean> {
    let success = false;

    // Limpiar Redis
    try {
      success = await redisService.flushAll();
    } catch (error) {
      logger.warn({ err: error }, 'Failed to flush Redis');
    }

    // Limpiar memoria
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

    // Verificar cache
    const cached = await this.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Ejecutar búsqueda y cachear resultado
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
    // Crear clave de cache basada en endpoint y parámetros
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

    // Verificar expiración
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    // Incrementar contador de hits
    entry.hits++;

    return entry.value as T;
  }

  /**
   * Establece valor en memoria (método privado)
   */
  private setInMemory<T>(key: string, value: T, ttl: number): void {
    // Limpiar entradas expiradas si nos acercamos al límite
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

// Instancia singleton
export const cacheService = new CacheService();
