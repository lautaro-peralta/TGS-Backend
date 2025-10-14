import { Options } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

// Detect if running in Docker
const isDocker = process.env.DOCKER_CONTAINER === 'true';

export default {
  driver: MySqlDriver,
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: process.env.DB_NAME || 'tpdesarrollo',
  user: process.env.DB_USER || 'dsw',
  password: process.env.DB_PASSWORD || 'dsw',
  host: process.env.DB_HOST || (isDocker ? 'mysql' : 'localhost'),
  port: parseInt(process.env.DB_PORT || (isDocker ? '3306' : '3307')),
  highlighter: new SqlHighlighter(),
  debug: process.env.NODE_ENV === 'development',
  
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
  pool: {
    min: 2,                      // Keep at least 2 connections alive
    max: 10,                     // Maximum 10 concurrent connections
    acquireTimeoutMillis: 30000, // Wait up to 30s for a connection
    idleTimeoutMillis: 30000,    // Close connections idle for 30s
  },

  // ============================================================================
  // CHARACTER SET CONFIGURATION
  // ============================================================================
  // UTF8MB4 supports full Unicode including emojis (😀) and special characters
  // UTF8 (without MB4) only supports Basic Multilingual Plane
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',

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
