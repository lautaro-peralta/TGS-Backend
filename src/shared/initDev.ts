// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import argon2 from 'argon2';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from './db/orm.js';
import { User, Role } from '../modules/auth/user/user.entity.js';
import { BasePersonEntity } from './base.person.entity.js';
import { Zone } from '../modules/zone/zone.entity.js';

// ============================================================================
// DEVELOPMENT SEED FUNCTIONS
// ============================================================================

/**
 * Creates a default admin user for development environment
 *
 * This function:
 * - Only executes in development mode
 * - Checks if admin already exists to prevent duplicates
 * - Creates a BasePersonEntity and User with admin role
 * - Uses secure password hashing with argon2
 *
 * @returns {Promise<void>}
 */
export async function createAdminDev() {
  // ──────────────────────────────────────────────────────────────────────
  // Environment validation
  // ──────────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'development') {
    console.log('createAdminDev is not executed outside of development');
    return;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Database context
  // ──────────────────────────────────────────────────────────────────────
  const em = orm.em.fork();

  // ──────────────────────────────────────────────────────────────────────
  // Admin credentials configuration
  // ──────────────────────────────────────────────────────────────────────
  const adminEmail = 'admin@local.dev';
  const adminPassword = 'admin123'; // Change it to your preferred password

  // ──────────────────────────────────────────────────────────────────────
  // Check for existing admin
  // ──────────────────────────────────────────────────────────────────────
  const existingAdmin = await em.findOne(User, { email: adminEmail });
  if (existingAdmin) {
    console.log();
    console.log('Admin already exists, a new one is not created');
    return;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Password hashing
  // ──────────────────────────────────────────────────────────────────────
  const hashedPassword = await argon2.hash(adminPassword);

  // ──────────────────────────────────────────────────────────────────────
  // Entity creation
  // ──────────────────────────────────────────────────────────────────────

  // Create base person entity with admin details
  const newAdmin = em.create(BasePersonEntity, {
    dni: '87654321',
    name: 'Administrator',
    email: adminEmail,
    phone: '-',
    address: '-',
  });

  // Create user entity linked to person with admin role
  const adminUser = new User(
    'theAdmin123',
    adminEmail,
    hashedPassword,
    [Role.ADMIN]
  );
  adminUser.person = newAdmin as any;
  adminUser.emailVerified = true;
  adminUser.profileCompleteness = 100;

  // ──────────────────────────────────────────────────────────────────────
  // Persist to database
  // ──────────────────────────────────────────────────────────────────────
  await em.persistAndFlush([newAdmin, adminUser]);
  console.log();
  console.log('Development admin created successfully');
}

/**
 * Creates a default central zone for development environment
 *
 * This function:
 * - Creates a headquarters zone if none exists
 * - Prevents duplicate central zones
 * - Marks the zone as headquarters for hierarchical purposes
 *
 * @returns {Promise<void>}
 */
export async function createZoneDev() {
  // ──────────────────────────────────────────────────────────────────────
  // Database context
  // ──────────────────────────────────────────────────────────────────────
  const em = orm.em.fork();

  // ──────────────────────────────────────────────────────────────────────
  // Check for existing headquarters
  // ──────────────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────
  // Create headquarters zone
  // ──────────────────────────────────────────────────────────────────────
  const newZone = new Zone('Central Zone', true);

  // ──────────────────────────────────────────────────────────────────────
  // Persist to database
  // ──────────────────────────────────────────────────────────────────────
  await em.persistAndFlush(newZone);
  console.log();
  console.log(`Central zone created successfully with ID ${newZone.id}`);
}
