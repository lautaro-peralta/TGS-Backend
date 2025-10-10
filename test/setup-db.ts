import { beforeAll, afterAll } from 'vitest';
import { orm } from '../src/shared/db/orm.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const sg = orm.getSchemaGenerator();
  await sg.dropSchema();
  await sg.createSchema();
});

afterAll(async () => {
  await orm.close(true);
});
