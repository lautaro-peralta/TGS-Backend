import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MikroORM } from '@mikro-orm/core';
import { createTestDatabase, clearDatabase, cleanupTestDatabase } from '../test-helpers.js';
import { User, Role } from '../../src/modules/auth/user/user.entity.js';
import { Client } from '../../src/modules/client/client.entity.js';
import argon2 from 'argon2';

/**
 * End-to-End User Flow Tests
 *
 * These tests verify complete user journeys and business processes.
 */
describe('E2E: User Flow Tests', () => {
  let orm: MikroORM;

  beforeAll(async () => {
    orm = await createTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(orm);
  });

  beforeEach(async () => {
    await clearDatabase(orm);
  });

  describe('New User Registration Flow', () => {
    it('should complete registration flow with profile setup', async () => {
      const em = orm.em.fork();

      // Step 1: User registers
      const user = new User();
      user.username = 'newuser';
      user.email = 'newuser@example.com';
      user.password = await argon2.hash('SecurePassword123!');
      user.roles = [Role.USER];

      await em.persistAndFlush(user);

      expect(user.id).toBeDefined();
      expect(user.roles).toContain(Role.USER);
      expect(user.verifiedByAdmin).toBe(false);

      // Step 2: User completes profile (simulated)
      const userId = user.id;
      em.clear();

      // Step 3: Verify user exists and can be retrieved
      const retrievedUser = await em.findOne(User, { id: userId });
      expect(retrievedUser).toBeTruthy();
      expect(retrievedUser?.username).toBe('newuser');
    });

    it('should calculate profile completeness correctly', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'profileuser';
      user.email = 'profile@example.com';
      user.password = await argon2.hash('Password123!');

      // Initial profile completeness (25% - account created)
      const initialCompleteness = user.calculateProfileCompleteness();
      expect(initialCompleteness).toBe(25);

      // After admin verification (50%)
      user.verifiedByAdmin = true;
      const afterVerification = user.calculateProfileCompleteness();
      expect(afterVerification).toBe(50);

      await em.persistAndFlush(user);
    });
  });

  describe('Client Upgrade Flow', () => {
    it('should upgrade user to client role', async () => {
      const em = orm.em.fork();

      // Step 1: Create regular user
      const user = new User();
      user.username = 'futureClient';
      user.email = 'client@example.com';
      user.password = await argon2.hash('Password123!');
      user.roles = [Role.USER];

      await em.persistAndFlush(user);
      const userId = user.id;

      // Step 2: Admin upgrades to CLIENT role
      em.clear();
      const upgradeUser = await em.findOne(User, { id: userId });
      expect(upgradeUser).toBeTruthy();

      upgradeUser!.roles = [Role.CLIENT];
      upgradeUser!.verifiedByAdmin = true;
      await em.flush();

      // Step 3: Verify upgrade
      em.clear();
      const clientUser = await em.findOne(User, { id: userId });
      expect(clientUser?.roles).toContain(Role.CLIENT);
      expect(clientUser?.verifiedByAdmin).toBe(true);
    });

    it('should not allow purchase without complete profile', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'incompleteclient';
      user.email = 'incomplete@example.com';
      user.password = await argon2.hash('Password123!');
      user.roles = [Role.CLIENT];
      user.verifiedByAdmin = false; // Not verified

      await em.persistAndFlush(user);

      expect(user.canPurchase()).toBe(false);
    });
  });

  describe('Admin User Management Flow', () => {
    it('should create admin and manage other users', async () => {
      const em = orm.em.fork();

      // Step 1: Create admin user
      const admin = new User();
      admin.username = 'admin';
      admin.email = 'admin@example.com';
      admin.password = await argon2.hash('AdminPassword123!');
      admin.roles = [Role.ADMIN];
      admin.verifiedByAdmin = true;

      await em.persistAndFlush(admin);
      expect(admin.roles).toContain(Role.ADMIN);

      // Step 2: Create regular user
      const regularUser = new User();
      regularUser.username = 'regular';
      regularUser.email = 'regular@example.com';
      regularUser.password = await argon2.hash('Password123!');

      await em.persistAndFlush(regularUser);
      const regularUserId = regularUser.id;

      // Step 3: Admin verifies regular user
      em.clear();
      const userToVerify = await em.findOne(User, { id: regularUserId });
      expect(userToVerify).toBeTruthy();

      userToVerify!.verifiedByAdmin = true;
      await em.flush();

      // Step 4: Verify changes persisted
      em.clear();
      const verifiedUser = await em.findOne(User, { id: regularUserId });
      expect(verifiedUser?.verifiedByAdmin).toBe(true);
    });
  });

  describe('Multi-Role User Flow', () => {
    it('should handle user with multiple roles', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'multirole';
      user.email = 'multi@example.com';
      user.password = await argon2.hash('Password123!');
      user.roles = [Role.USER, Role.CLIENT, Role.PARTNER];

      await em.persistAndFlush(user);

      expect(user.roles).toHaveLength(3);
      expect(user.roles).toContain(Role.USER);
      expect(user.roles).toContain(Role.CLIENT);
      expect(user.roles).toContain(Role.PARTNER);
    });
  });

  describe('User Deactivation Flow', () => {
    it('should deactivate and reactivate user', async () => {
      const em = orm.em.fork();

      // Step 1: Create active user
      const user = new User();
      user.username = 'toggleactive';
      user.email = 'toggle@example.com';
      user.password = await argon2.hash('Password123!');
      user.isActive = true;

      await em.persistAndFlush(user);
      const userId = user.id;

      expect(user.isActive).toBe(true);

      // Step 2: Deactivate user
      em.clear();
      const userToDeactivate = await em.findOne(User, { id: userId });
      userToDeactivate!.isActive = false;
      await em.flush();

      // Step 3: Verify deactivation
      em.clear();
      const deactivatedUser = await em.findOne(User, { id: userId });
      expect(deactivatedUser?.isActive).toBe(false);

      // Step 4: Reactivate user
      deactivatedUser!.isActive = true;
      await em.flush();

      // Step 5: Verify reactivation
      em.clear();
      const reactivatedUser = await em.findOne(User, { id: userId });
      expect(reactivatedUser?.isActive).toBe(true);
    });
  });

  describe('Password Update Flow', () => {
    it('should update user password', async () => {
      const em = orm.em.fork();

      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';

      // Step 1: Create user with initial password
      const user = new User();
      user.username = 'passwordchange';
      user.email = 'pwchange@example.com';
      user.password = await argon2.hash(oldPassword);

      await em.persistAndFlush(user);
      const userId = user.id;

      // Step 2: Verify old password works
      const oldPasswordValid = await argon2.verify(user.password, oldPassword);
      expect(oldPasswordValid).toBe(true);

      // Step 3: Update password
      em.clear();
      const userToUpdate = await em.findOne(User, { id: userId });
      userToUpdate!.password = await argon2.hash(newPassword);
      await em.flush();

      // Step 4: Verify new password works and old doesn't
      em.clear();
      const updatedUser = await em.findOne(User, { id: userId });

      const newPasswordValid = await argon2.verify(updatedUser!.password, newPassword);
      expect(newPasswordValid).toBe(true);

      const oldPasswordStillWorks = await argon2.verify(updatedUser!.password, oldPassword);
      expect(oldPasswordStillWorks).toBe(false);
    });
  });

  describe('Batch User Operations', () => {
    it('should create and query multiple users', async () => {
      const em = orm.em.fork();

      // Create multiple users
      const users = [];
      for (let i = 1; i <= 5; i++) {
        const user = new User();
        user.username = `user${i}`;
        user.email = `user${i}@example.com`;
        user.password = await argon2.hash(`Password${i}!`);
        users.push(user);
      }

      await em.persistAndFlush(users);

      // Query all users
      em.clear();
      const allUsers = await em.find(User, {});
      expect(allUsers).toHaveLength(5);

      // Query with filter
      const user3 = await em.findOne(User, { username: 'user3' });
      expect(user3?.email).toBe('user3@example.com');
    });
  });
});
