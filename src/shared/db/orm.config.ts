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
  migrations: {
    path: './src/migrations', // Path to store migrations
    snapshot: false,
    disableForeignKeys: false,
  },
  schemaGenerator: {
    disableForeignKeys: false, // Keep foreign keys
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
} as Options;