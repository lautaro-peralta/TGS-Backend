import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { createTestDatabase, clearDatabase, cleanupTestDatabase } from '../test-helpers.js';
import { User, Role } from '../../src/modules/auth/user/user.entity.js';
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
      const hashedPassword = await argon2.hash('SecurePassword123!');
      const user = new User('newuser', 'newuser@example.com', hashedPassword);

      await em.persistAndFlush(user);

      expect(user.id).toBeDefined();
      expect(user.roles).toContain(Role.USER);
      expect(user.isVerified).toBe(false);

      // Step 2: Verify user exists and can be retrieved
      const userId = user.id;
      em.clear();

      const retrievedUser = await em.findOne(User, { id: userId });
      expect(retrievedUser).toBeTruthy();
      expect(retrievedUser?.username).toBe('newuser');
    });

    it('should calculate profile completeness correctly', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('profileuser', 'profile@example.com', hashedPassword);

      // Initial profile completeness (25% - account created)
      const initialCompleteness = user.calculateProfileCompleteness();
      expect(initialCompleteness).toBe(25);

      // After admin verification (50%)
      user.isVerified = true;
      const afterVerification = user.calculateProfileCompleteness();
      expect(afterVerification).toBe(50);

      await em.persistAndFlush(user);
    });
  });

  describe('Client Upgrade Flow', () => {
    it('should upgrade user to client role', async () => {
      const em = orm.em.fork();

      // Step 1: Create regular user
      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('futureClient', 'client@example.com', hashedPassword);

      await em.persistAndFlush(user);
      const userId = user.id;

      // Step 2: Admin upgrades to CLIENT role
      em.clear();
      const upgradeUser = await em.findOne(User, { id: userId });
      expect(upgradeUser).toBeTruthy();

      upgradeUser!.roles = [Role.CLIENT];
      upgradeUser!.isVerified = true;
      await em.flush();

      // Step 3: Verify upgrade
      em.clear();
      const clientUser = await em.findOne(User, { id: userId });
      expect(clientUser?.roles).toContain(Role.CLIENT);
      expect(clientUser?.isVerified).toBe(true);
    });

    it('should not allow purchase without verification', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('incompleteclient', 'incomplete@example.com', hashedPassword, [Role.CLIENT]);
      user.isVerified = false; // Not verified

      await em.persistAndFlush(user);

      expect(user.canPurchase()).toBe(false);
    });
  });

  describe('Admin User Management Flow', () => {
    it('should create admin and manage other users', async () => {
      const em = orm.em.fork();

      // Step 1: Create admin user
      const adminPassword = await argon2.hash('AdminPassword123!');
      const admin = new User('admin', 'admin@example.com', adminPassword, [Role.ADMIN]);
      admin.isVerified = true;

      await em.persistAndFlush(admin);
      expect(admin.roles).toContain(Role.ADMIN);

      // Step 2: Create regular user
      const regularPassword = await argon2.hash('Password123!');
      const regularUser = new User('regular', 'regular@example.com', regularPassword);

      await em.persistAndFlush(regularUser);
      const regularUserId = regularUser.id;

      // Step 3: Admin verifies regular user
      em.clear();
      const userToVerify = await em.findOne(User, { id: regularUserId });
      expect(userToVerify).toBeTruthy();

      userToVerify!.isVerified = true;
      await em.flush();

      // Step 4: Verify changes persisted
      em.clear();
      const verifiedUser = await em.findOne(User, { id: regularUserId });
      expect(verifiedUser?.isVerified).toBe(true);
    });
  });

  describe('Multi-Role User Flow', () => {
    it('should handle user with multiple roles', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('multirole', 'multi@example.com', hashedPassword, [
        Role.USER,
        Role.CLIENT,
        Role.PARTNER,
      ]);

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
      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('toggleactive', 'toggle@example.com', hashedPassword);
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
      const hashedOldPassword = await argon2.hash(oldPassword);
      const user = new User('passwordchange', 'pwchange@example.com', hashedOldPassword);

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
        const hashedPassword = await argon2.hash(`Password${i}!`);
        const user = new User(`user${i}`, `user${i}@example.com`, hashedPassword);
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
