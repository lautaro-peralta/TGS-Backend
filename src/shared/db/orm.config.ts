import { Options } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

export default {
  driver: MySqlDriver,
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: 'tpdesarrollo',
  user: 'dsw',
  password: 'dsw',
  host: 'localhost',
  port: 3307,
  highlighter: new SqlHighlighter(),
  debug: process.env.NODE_ENV === 'development',
  migrations: {
    path: './src/migrations', // Ruta para almacenar migraciones
    snapshot: false,
    disableForeignKeys: false,
  },
  schemaGenerator: {
    disableForeignKeys: false, // Mantener claves foráneas
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
} as Options;
