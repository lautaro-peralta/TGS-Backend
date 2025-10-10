import { MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqliteDriver } from '@mikro-orm/sqlite';
import config from './orm.config.js';

// Determine environment: use SQLite in tests, MySQL otherwise
const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Initialize MikroORM instance
 * - Uses MySQL for development and production
 * - Uses SQLite in-memory database for testing
 */
export const orm = await MikroORM.init({
  ...config,
  driver: (isTestEnv ? SqliteDriver : MySqlDriver) as any,
  dbName: isTestEnv ? ':memory:' : (config as any).dbName,
});

/**
 * Updates the database schema (used in dev mode).
 * In tests, the schema is created/dropped by setup-db.ts.
 */
export const syncSchema = async (): Promise<void> => {
  const generator = orm.getSchemaGenerator();
  await generator.updateSchema();
};

/**
 * Drops and recreates the entire schema (useful for manual resets or tests).
 */
export const resetSchema = async (): Promise<void> => {
  const generator = orm.getSchemaGenerator();
  await generator.dropSchema();
  await generator.createSchema();
};
