// src/test/setup-db.ts
import 'reflect-metadata';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { orm } from '../shared/db/orm.js';
import { User } from '../modules/auth/user/user.entity.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 4);

beforeAll(async () => {
  const sg = orm.getSchemaGenerator();

  // Reset de esquema para asegurar estado limpio en test
  await sg.dropSchema({ wrap: false }).catch(() => void 0);
  await sg.createSchema();

  // Seed: usuario demo para login
  const em = orm.em.fork();

  const passwordHash = await bcrypt.hash('Demo123!', SALT_ROUNDS);

  // 🔹 En tu entidad la propiedad es "roles" (array), no "role".
  // 🔹 Si tu User exige otros campos obligatorios, añadilos aquí.
  const demo = em.create(User, {
    username: 'demo',
    email: 'demo@tgs.com',
    password: passwordHash,
    roles: ['ADMIN'],
    emailVerified: true,
  } as any);

  await em.persistAndFlush(demo);
});

beforeEach(async () => {
  // Si necesitás limpiar entre tests, podés usar:
  // await orm.getSchemaGenerator().clearDatabase();
});

afterAll(async () => {
  await orm.close(true);
});
