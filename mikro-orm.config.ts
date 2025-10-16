// mikro-orm.config.ts
import { defineConfig } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqliteDriver } from '@mikro-orm/sqlite';

const isTest = process.env.NODE_ENV === 'test';

export default defineConfig({
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],

  // v6: usar `driver` y castear el ternario para evitar el union type error
  driver: (isTest ? SqliteDriver : MySqlDriver) as any,

  // TEST: sqlite en memoria
  dbName: isTest ? ':memory:' : (process.env.DB_NAME as string),

  // DEV/PROD: mysql desde .env
  host: isTest ? undefined : process.env.DB_HOST,
  port: isTest ? undefined : Number(process.env.DB_PORT ?? 3306),
  user: isTest ? undefined : process.env.DB_USER,
  password: isTest ? undefined : process.env.DB_PASSWORD,

  debug: false,
});
