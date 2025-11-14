import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
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

      const hashedPassword = await argon2.hash('SecurePassword123!');
      const user = new User('testuser', 'test@example.com', hashedPassword);

      await em.persistAndFlush(user);

      expect(user.id).toBeDefined();
      expect(user.password).not.toBe('SecurePassword123!');
      expect(user.password).toMatch(/^\$argon2/);
    });

    it('should prevent duplicate usernames', async () => {
      const em = orm.em.fork();

      const hashedPassword1 = await argon2.hash('Password123!');
      const user1 = new User('duplicate', 'user1@example.com', hashedPassword1);

      await em.persistAndFlush(user1);

      const hashedPassword2 = await argon2.hash('Password123!');
      const user2 = new User('duplicate', 'user2@example.com', hashedPassword2);

      await expect(em.persistAndFlush(user2)).rejects.toThrow();
    });

    it('should prevent duplicate emails', async () => {
      const em = orm.em.fork();

      const hashedPassword1 = await argon2.hash('Password123!');
      const user1 = new User('user1', 'duplicate@example.com', hashedPassword1);

      await em.persistAndFlush(user1);

      const hashedPassword2 = await argon2.hash('Password123!');
      const user2 = new User('user2', 'duplicate@example.com', hashedPassword2);

      await expect(em.persistAndFlush(user2)).rejects.toThrow();
    });
  });

  describe('User Login', () => {
    it('should verify password correctly', async () => {
      const em = orm.em.fork();
      const password = 'SecurePassword123!';

      const hashedPassword = await argon2.hash(password);
      const user = new User('loginuser', 'login@example.com', hashedPassword);
      user.isActive = true;

      await em.persistAndFlush(user);

      const verified = await argon2.verify(user.password, password);
      expect(verified).toBe(true);

      const wrongPassword = await argon2.verify(user.password, 'WrongPassword123!');
      expect(wrongPassword).toBe(false);
    });

    it('should find user by username', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('findme', 'findme@example.com', hashedPassword);

      await em.persistAndFlush(user);

      const foundUser = await em.findOne(User, { username: 'findme' });
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('findme@example.com');
    });

    it('should find user by email', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('emailuser', 'findbyme@example.com', hashedPassword);

      await em.persistAndFlush(user);

      const foundUser = await em.findOne(User, { email: 'findbyme@example.com' });
      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe('emailuser');
    });

    it('should not find inactive users', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('inactive', 'inactive@example.com', hashedPassword);
      user.isActive = false;

      await em.persistAndFlush(user);

      const foundUser = await em.findOne(User, { username: 'inactive', isActive: true });
      expect(foundUser).toBeNull();
    });
  });

  describe('User Roles', () => {
    it('should assign default USER role', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('roleuser', 'role@example.com', hashedPassword);

      await em.persistAndFlush(user);

      expect(user.roles).toContain(Role.USER);
      expect(user.roles).toHaveLength(1);
    });

    it('should support multiple roles', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('multirole', 'multi@example.com', hashedPassword, [
        Role.USER,
        Role.CLIENT,
      ]);

      await em.persistAndFlush(user);

      expect(user.roles).toContain(Role.USER);
      expect(user.roles).toContain(Role.CLIENT);
      expect(user.roles).toHaveLength(2);
    });

    it('should query users by role', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const adminUser = new User('admin', 'admin@example.com', hashedPassword, [Role.ADMIN]);

      await em.persistAndFlush(adminUser);

      const admins = await em.find(User, { roles: { $contains: [Role.ADMIN] } });
      expect(admins).toHaveLength(1);
      expect(admins[0].username).toBe('admin');
    });
  });

  describe('User Status', () => {
    it('should default to active', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('activeuser', 'active@example.com', hashedPassword);

      await em.persistAndFlush(user);

      expect(user.isActive).toBe(true);
    });

    it('should default to not verified', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('newuser', 'new@example.com', hashedPassword);

      await em.persistAndFlush(user);

      expect(user.isVerified).toBe(false);
    });

    it('should support verification', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('verifyuser', 'verify@example.com', hashedPassword);
      user.isVerified = true;

      await em.persistAndFlush(user);

      expect(user.isVerified).toBe(true);
    });
  });

  describe('Profile Completeness', () => {
    it('should default to 25% for new users', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('profileuser', 'profile@example.com', hashedPassword);

      await em.persistAndFlush(user);

      expect(user.profileCompleteness).toBe(25);
    });

    it('should calculate completeness correctly', async () => {
      const em = orm.em.fork();

      const hashedPassword = await argon2.hash('Password123!');
      const user = new User('completeuser', 'complete@example.com', hashedPassword);
      user.isVerified = true;

      const completeness = user.calculateProfileCompleteness();
      expect(completeness).toBeGreaterThan(25);
    });
  });
});
