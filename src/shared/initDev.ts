import argon2 from 'argon2';
import { orm } from './db/orm.js';
import { User, Role } from '../modules/auth/user.entity.js';
import { BasePersonEntity } from './db/base.person.entity.js';
import { Zone } from '../modules/zone/zone.entity.js';

export async function createAdminDev() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('createAdminDev is not executed outside of development');
    return;
  }

  const em = orm.em.fork();

  const adminEmail = 'admin@local.dev';
  const adminPassword = 'admin123'; // Change it to your preferred password

  const existingAdmin = await em.findOne(User, { email: adminEmail });
  if (existingAdmin) {
    console.log();
    console.log('Admin already exists, a new one is not created');
    return;
  }

  const hashedPassword = await argon2.hash(adminPassword);

  const newAdmin = em.create(BasePersonEntity, {
    dni: '87654321',
    name: 'Administrator',
    email: adminEmail,
    phone: '-',
    address: '-',
  });
  const adminUser = em.create(User, {
    username: 'theAdmin123',
    email: adminEmail,
    roles: [Role.ADMIN],
    password: hashedPassword,
    person: newAdmin,
  });

  await em.persistAndFlush([newAdmin, adminUser]);
  console.log();
  console.log('Development admin created successfully');
}

export async function createZoneDev() {
  const em = orm.em.fork();

  // Search if a zone marked as central already exists
  const existingHeardquarters = await em.findOne(Zone, {
    isHeadquarters: true,
  });

  if (existingHeardquarters) {
    console.log();
    console.log(
      `Central office already exists: ${existingHeardquarters.name} (ID: ${existingHeardquarters.id}), another one is not created`
    );
    return;
  }

  // Create a new zone and mark it as a central zone
  const newZone = new Zone('Central Zone', true);

  await em.persistAndFlush(newZone);
  console.log();
  console.log(`Central zone created successfully with ID ${newZone.id}`);
}
