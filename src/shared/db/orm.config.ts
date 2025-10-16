// src/shared/db/orm.config.ts
import { defineConfig, ReflectMetadataProvider } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

const isDocker = process.env.DOCKER_CONTAINER === 'true';
const isTest = process.env.NODE_ENV === 'test';

// ✅ Importar entidades por clase (ESM-friendly; evita rutas absolutas tipo C:\...)
// Ajustá la lista según tus entidades usadas en tests/arranque:
import { User } from '../../modules/auth/user/user.entity.js';
import { Product } from '../../modules/product/product.entity.js';
import { Sale } from '../../modules/sale/sale.entity.js';
import { Client } from '../../modules/client/client.entity.js';
import { Distributor } from '../../modules/distributor/distributor.entity.js';
import { Detail } from '../../modules/sale/detail.entity.js';
import { Zone } from '../../modules/zone/zone.entity.js';
import { Authority } from '../../modules/authority/authority.entity.js';
// Si necesitás más, agregalas aquí:
// import { Client } from '../../modules/client/client.entity.js';
// import { Authority } from '../../modules/authority/authority.entity.js';
// ...

export default defineConfig({
  // 🔹 IMPORTANT: NO usar globs (entities / entitiesTs) en ESM+Windows para tests.
  //    Registramos por referencia de clase.
  entities: [User, Product, Sale, Client, Distributor, Detail, Zone, Authority],

  // Driver condicional: SQLite en test, MySQL en dev/prod
  driver: (isTest ? SqliteDriver : MySqlDriver) as any,
  // Use better-sqlite3 in tests to avoid sqlite3 binding issues on Windows
  ...(isTest ? { driverOptions: { client: 'better-sqlite3' } } : {}),
  metadataProvider: ReflectMetadataProvider,
  // DB config
  dbName: isTest ? ':memory:' : (process.env.DB_NAME || 'tpdesarrollo'),
  user: isTest ? undefined : (process.env.DB_USER || 'dsw'),
  password: isTest ? undefined : (process.env.DB_PASSWORD || 'dsw'),
  host: isTest ? undefined : (process.env.DB_HOST || (isDocker ? 'mysql' : 'localhost')),
  port: isTest ? undefined : parseInt(process.env.DB_PORT || (isDocker ? '3306' : '3307')),

  // Perf/UX
  highlighter: new SqlHighlighter(),
  debug: process.env.NODE_ENV === 'development',

  // Pooling: aplicable a MySQL; SQLite in-memory lo ignora
  ...(isTest
    ? {}
    : {
        pool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
        },
      }),

  // Charset (MySQL)
  ...(isTest
    ? {}
    : {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }),

  // Migrations (MySQL)
  migrations: {
    path: './src/migrations',
    snapshot: false,
    disableForeignKeys: false,
  },

  // Schema generator
  schemaGenerator: {
    disableForeignKeys: false,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },

  // 🔒 Evita descubrimiento dinámico por archivos en ESM (estable en Windows)
  discovery: {
    warnWhenNoEntities: false,
    requireEntitiesArray: true,
    disableDynamicFileAccess: true,
  },
});
