import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MikroORM } from '@mikro-orm/core';
import { createTestDatabase, clearDatabase, cleanupTestDatabase } from '../../test-helpers.js';
import { User, Role } from '../../../src/modules/auth/user/user.entity.js';
import argon2 from 'argon2';

/**
 * Auth Integration Tests
 *
 * These tests verify database operations and business logic
 * without requiring the full Express application.
 */
describe('Auth Integration Tests', () => {
  let orm: MikroORM;

  beforeAll(async () => {
    // Initialize test database
    orm = await createTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(orm);
  });

  beforeEach(async () => {
    await clearDatabase(orm);
  });

  describe('User Registration', () => {
    it('should create a new user with hashed password', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = await argon2.hash('SecurePassword123!');
      user.roles = [Role.USER];

      await em.persistAndFlush(user);

      expect(user.id).toBeDefined();
      expect(user.password).not.toBe('SecurePassword123!');
      expect(user.password).toMatch(/^\$argon2/);
    });

    it('should prevent duplicate usernames', async () => {
      const em = orm.em.fork();

      const user1 = new User();
      user1.username = 'duplicate';
      user1.email = 'user1@example.com';
      user1.password = await argon2.hash('Password123!');

      await em.persistAndFlush(user1);

      const user2 = new User();
      user2.username = 'duplicate';
      user2.email = 'user2@example.com';
      user2.password = await argon2.hash('Password123!');

      await expect(em.persistAndFlush(user2)).rejects.toThrow();
    });

    it('should prevent duplicate emails', async () => {
      const em = orm.em.fork();

      const user1 = new User();
      user1.username = 'user1';
      user1.email = 'duplicate@example.com';
      user1.password = await argon2.hash('Password123!');

      await em.persistAndFlush(user1);

      const user2 = new User();
      user2.username = 'user2';
      user2.email = 'duplicate@example.com';
      user2.password = await argon2.hash('Password123!');

      await expect(em.persistAndFlush(user2)).rejects.toThrow();
    });
  });

  describe('User Login', () => {
    it('should verify password correctly', async () => {
      const em = orm.em.fork();
      const password = 'SecurePassword123!';

      const user = new User();
      user.username = 'loginuser';
      user.email = 'login@example.com';
      user.password = await argon2.hash(password);
      user.isActive = true;

      await em.persistAndFlush(user);

      const verified = await argon2.verify(user.password, password);
      expect(verified).toBe(true);

      const wrongPassword = await argon2.verify(user.password, 'WrongPassword123!');
      expect(wrongPassword).toBe(false);
    });

    it('should find user by username', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'findme';
      user.email = 'findme@example.com';
      user.password = await argon2.hash('Password123!');

      await em.persistAndFlush(user);
      em.clear();

      const foundUser = await em.findOne(User, { username: 'findme' });
      expect(foundUser).toBeTruthy();
      expect(foundUser?.email).toBe('findme@example.com');
    });

    it('should find user by email', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'emailuser';
      user.email = 'findbyemail@example.com';
      user.password = await argon2.hash('Password123!');

      await em.persistAndFlush(user);
      em.clear();

      const foundUser = await em.findOne(User, { email: 'findbyemail@example.com' });
      expect(foundUser).toBeTruthy();
      expect(foundUser?.username).toBe('emailuser');
    });
  });

  describe('User Roles', () => {
    it('should default to USER role', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'defaultrole';
      user.email = 'defaultrole@example.com';
      user.password = await argon2.hash('Password123!');

      await em.persistAndFlush(user);

      expect(user.roles).toEqual([Role.USER]);
    });

    it('should allow assigning CLIENT role', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'client';
      user.email = 'client@example.com';
      user.password = await argon2.hash('Password123!');
      user.roles = [Role.CLIENT];

      await em.persistAndFlush(user);

      expect(user.roles).toContain(Role.CLIENT);
    });

    it('should allow assigning ADMIN role', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'admin';
      user.email = 'admin@example.com';
      user.password = await argon2.hash('Password123!');
      user.roles = [Role.ADMIN];

      await em.persistAndFlush(user);

      expect(user.roles).toContain(Role.ADMIN);
    });

    it('should allow multiple roles', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'multirole';
      user.email = 'multirole@example.com';
      user.password = await argon2.hash('Password123!');
      user.roles = [Role.USER, Role.CLIENT];

      await em.persistAndFlush(user);

      expect(user.roles).toHaveLength(2);
      expect(user.roles).toContain(Role.USER);
      expect(user.roles).toContain(Role.CLIENT);
    });
  });

  describe('User Status', () => {
    it('should default to active', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'activeuser';
      user.email = 'active@example.com';
      user.password = await argon2.hash('Password123!');

      await em.persistAndFlush(user);

      expect(user.isActive).toBe(true);
    });

    it('should allow deactivating user', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'inactive';
      user.email = 'inactive@example.com';
      user.password = await argon2.hash('Password123!');
      user.isActive = false;

      await em.persistAndFlush(user);

      expect(user.isActive).toBe(false);
    });
  });

  describe('User Verification', () => {
    it('should default to not verified by admin', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'unverified';
      user.email = 'unverified@example.com';
      user.password = await argon2.hash('Password123!');

      await em.persistAndFlush(user);

      expect(user.verifiedByAdmin).toBe(false);
    });

    it('should allow admin verification', async () => {
      const em = orm.em.fork();

      const user = new User();
      user.username = 'verified';
      user.email = 'verified@example.com';
      user.password = await argon2.hash('Password123!');
      user.verifiedByAdmin = true;

      await em.persistAndFlush(user);

      expect(user.verifiedByAdmin).toBe(true);
    });
  });
});
