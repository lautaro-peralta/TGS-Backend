// ============================================================================
// REDIS SERVICE - Redis connection service and operations with fallbacks
// ============================================================================

import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger.js';
import { env } from '../../config/env.js';

/**
 * Servicio Redis con configuración de producción y fallbacks
 */
export class RedisService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 1000; // 1 segundo

  /**
   * Inicializa la conexión Redis (solo si está habilitado y configurado)
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    // Check if Redis is enabled
    if (!env.REDIS_ENABLED) {
      logger.info('Redis is disabled, skipping connection');
      return;
    }

    // Check that Redis environment variables are defined
    if (!env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      logger.info('Redis host not configured, skipping connection');
      return;
    }

    try {
      this.client = createClient({
        url: env.REDIS_PASSWORD
          ? `redis://:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}/${env.REDIS_DB}`
          : `redis://${env.REDIS_HOST}:${env.REDIS_PORT}/${env.REDIS_DB}`,
        socket: {
          connectTimeout: 60000,
          keepAlive: true,
          reconnectStrategy: (retries: number) => {
            if (retries > this.maxRetries) {
              logger.error('Max Redis reconnection attempts reached');
              return false;
            }
            return Math.min(retries * this.retryDelay, 10000);
          },
        },
      });

      // Handle connection events
      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        logger.info('Redis connected and ready');
      });

      this.client.on('error', (error: any) => {
        this.isConnected = false;
        logger.error({ err: error }, 'Redis connection error');
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.warn('Redis connection ended');
      });

      // Connect
      await this.client.connect();

      // Verify connection with ping
      await this.client.ping();

      logger.info('Redis connection established successfully');

    } catch (error) {
      this.isConnected = false;
      logger.error({ err: error }, 'Failed to connect to Redis');

      // Throw error if Redis is required in production
      if (env.NODE_ENV === 'production') {
        throw new Error('Redis connection is required in production environment');
      }
    }
  }

  /**
   * Gets Redis client (automatically connects if necessary)
   */
  async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      await this.connect();
    }

    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    return this.client!;
  }

  /**
   * Checks if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    // If Redis is disabled, always return false
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return false;
    }

    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene un valor del cache
   */
  async get(key: string): Promise<string | null> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return null;
    }

    try {
      const client = await this.getClient();
      return await client.get(key);
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to get value from Redis');
      return null;
    }
  }

  /**
   * Establece un valor en el cache
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return false;
    }

    try {
      const client = await this.getClient();

      if (ttl) {
        await client.setEx(key, ttl, value);
      } else {
        await client.set(key, value);
      }

      return true;
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to set value in Redis');
      return false;
    }
  }

  /**
   * Elimina un valor del cache
   */
  async delete(key: string): Promise<boolean> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return false;
    }

    try {
      const client = await this.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to delete value from Redis');
      return false;
    }
  }

  /**
   * Obtiene múltiples valores del cache
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return keys.map(() => null);
    }

    try {
      const client = await this.getClient();
      return await client.mGet(keys);
    } catch (error) {
      logger.warn({ err: error, keys }, 'Failed to get multiple values from Redis');
      return keys.map(() => null);
    }
  }

  /**
   * Establece múltiples valores en el cache
   */
  async mset(pairs: Array<{ key: string; value: string; ttl?: number }>): Promise<boolean> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return false;
    }

    try {
      const client = await this.getClient();
      const pipeline = client.multi();

      for (const pair of pairs) {
        if (pair.ttl) {
          pipeline.setEx(pair.key, pair.ttl, pair.value);
        } else {
          pipeline.set(pair.key, pair.value);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.warn({ err: error, pairs }, 'Failed to set multiple values in Redis');
      return false;
    }
  }

  /**
   * Verifica si una clave existe
   */
  async exists(key: string): Promise<boolean> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return false;
    }

    try {
      const client = await this.getClient();
      const result = await client.exists(key);
      return result > 0;
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to check key existence in Redis');
      return false;
    }
  }

  /**
   * Obtiene el TTL de una clave
   */
  async getTTL(key: string): Promise<number> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return -1;
    }

    try {
      const client = await this.getClient();
      return await client.ttl(key);
    } catch (error) {
      logger.warn({ err: error, key }, 'Failed to get TTL from Redis');
      return -1;
    }
  }

  /**
   * Incrementa un valor numérico
   */
  async increment(key: string, increment: number = 1): Promise<number | null> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return null;
    }

    try {
      const client = await this.getClient();
      return await client.incrBy(key, increment);
    } catch (error) {
      logger.warn({ err: error, key, increment }, 'Failed to increment value in Redis');
      return null;
    }
  }

  /**
   * Añade un elemento a una lista
   */
  async listPush(key: string, value: string): Promise<number | null> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return null;
    }

    try {
      const client = await this.getClient();
      return await client.lPush(key, value);
    } catch (error) {
      logger.warn({ err: error, key, value }, 'Failed to push to list in Redis');
      return null;
    }
  }

  /**
   * Obtiene elementos de una lista
   */
  async listRange(key: string, start: number = 0, stop: number = -1): Promise<string[]> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return [];
    }

    try {
      const client = await this.getClient();
      return await client.lRange(key, start, stop);
    } catch (error) {
      logger.warn({ err: error, key, start, stop }, 'Failed to get list range from Redis');
      return [];
    }
  }

  /**
   * Publica un mensaje en un canal
   */
  async publish(channel: string, message: string): Promise<number | null> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return null;
    }

    try {
      const client = await this.getClient();
      return await client.publish(channel, message);
    } catch (error) {
      logger.warn({ err: error, channel, message }, 'Failed to publish message to Redis');
      return null;
    }
  }

  /**
   * Suscribe a un canal (para uso avanzado)
   */
  async subscribe(channels: string[], callback: (message: string, channel: string) => void): Promise<void> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      logger.info('Redis is disabled, cannot subscribe to channels');
      return;
    }

    try {
      const client = await this.getClient();

      await client.subscribe(channels, (message, channel) => {
        callback(message, channel);
      });

      logger.info({ channels }, 'Successfully subscribed to Redis channels');
    } catch (error) {
      logger.error({ err: error, channels }, 'Failed to subscribe to Redis channels');
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de Redis
   */
  async getStats(): Promise<any> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      return { connected: false, disabled: true };
    }

    try {
      const client = await this.getClient();

      const info = await client.info();
      const memory = await client.info('memory');

      return {
        connected: this.isConnected,
        info,
        memory,
      };
    } catch (error) {
      logger.warn({ err: error }, 'Failed to get Redis stats');
      return { connected: false };
    }
  }

  /**
   * Limpia todo el cache (operación administrativa)
   */
  async flushAll(): Promise<boolean> {
    if (!env.REDIS_ENABLED || !env.REDIS_HOST || env.REDIS_HOST === 'undefined') {
      logger.info('Redis is disabled, nothing to flush');
      return false;
    }

    try {
      const client = await this.getClient();
      await client.flushAll();
      logger.info('Redis cache flushed');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to flush Redis cache');
      return false;
    }
  }

  /**
   * Cierra la conexión Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }
}

// Instancia singleton
export const redisService = new RedisService();
