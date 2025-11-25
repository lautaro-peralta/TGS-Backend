import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

// Detect if running in Docker
const isDocker = process.env.DOCKER_CONTAINER === 'true';

export default {
  driver: PostgreSqlDriver,
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: process.env.DB_NAME || 'tpdesarrollo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || (isDocker ? 'postgres' : 'localhost'),
  port: parseInt(process.env.DB_PORT || (isDocker ? '5432' : '5432')),
  highlighter: new SqlHighlighter(),
  debug: process.env.NODE_ENV === 'development',

  // ============================================================================
  // SSL CONFIGURATION (for cloud databases like Neon.tech)
  // ============================================================================
  // Enable SSL in production for secure connections to cloud PostgreSQL
  driverOptions: process.env.NODE_ENV === 'production' ? {
    connection: {
      ssl: { rejectUnauthorized: false }
    }
  } : undefined,
  
  // ============================================================================
  // CONNECTION POOL CONFIGURATION
  // ============================================================================
  // Connection pooling improves performance by reusing database connections
  // instead of creating new ones for each query.
  //
  // For academic evaluation:
  // - min: Minimum connections kept alive (reduces connection overhead)
  // - max: Maximum connections allowed (prevents database overload)
  // - acquireTimeoutMillis: Max time to wait for available connection
  // - idleTimeoutMillis: Close idle connections after this time
  //
  // OPTIMIZED FOR SERVERLESS (Vercel):
  // - Lower min to reduce idle connections in serverless
  // - Lower max to prevent connection exhaustion
  // - Shorter idle timeout to close unused connections faster
  pool: {
    min: process.env.NODE_ENV === 'production' ? 0 : 2,  // No idle connections in serverless
    max: process.env.NODE_ENV === 'production' ? 5 : 10, // Lower max for serverless
    acquireTimeoutMillis: 30000,                          // Wait up to 30s for a connection
    idleTimeoutMillis: 10000,                             // Close idle connections after 10s (faster for serverless)
  },

  // ============================================================================
  // CHARACTER SET CONFIGURATION
  // ============================================================================
  // PostgreSQL uses UTF8 by default for full Unicode support including emojis
  // No need to specify charset/collate (handled automatically by PostgreSQL)

  // ============================================================================
  // MIGRATIONS CONFIGURATION
  // ============================================================================
  migrations: {
    path: './src/migrations',
    snapshot: false,
    disableForeignKeys: false,
  },

  // ============================================================================
  // SCHEMA GENERATOR CONFIGURATION
  // ============================================================================
  schemaGenerator: {
    disableForeignKeys: false,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
} as Options;
