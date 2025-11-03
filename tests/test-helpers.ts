import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import mikroOrmConfig from '../src/shared/db/mikro-orm.config.js';

/**
 * Create a test database connection
 */
export async function createTestDatabase(): Promise<MikroORM<PostgreSqlDriver>> {
  const orm = await MikroORM.init({
    ...mikroOrmConfig,
    dbName: process.env.DB_NAME || 'tgs_test',
    allowGlobalContext: true,
  });

  // Run migrations
  await orm.getMigrator().up();

  return orm;
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase(orm: MikroORM<PostgreSqlDriver>): Promise<void> {
  const generator = orm.getSchemaGenerator();
  await generator.dropSchema();
  await orm.close(true);
}

/**
 * Clear all tables but keep schema
 */
export async function clearDatabase(orm: MikroORM<PostgreSqlDriver>): Promise<void> {
  const em = orm.em.fork();
  const connection = em.getConnection();

  // Disable foreign key checks
  await connection.execute('SET session_replication_role = replica;');

  // Get all tables
  const tables = await connection.execute<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );

  // Truncate all tables
  for (const { tablename } of tables) {
    if (tablename !== 'mikro_orm_migrations') {
      await connection.execute(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }

  // Re-enable foreign key checks
  await connection.execute('SET session_replication_role = DEFAULT;');
}

/**
 * Generate mock JWT token for testing
 */
export function generateMockToken(payload: any): string {
  return `mock.jwt.token.${JSON.stringify(payload)}`;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Sleep for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
