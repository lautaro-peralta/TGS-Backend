import { describe, it, expect, beforeEach } from '@jest/globals';
import { User, Role } from '../../../src/modules/auth/user/user.entity.js';
import { BasePersonEntity } from '../../../src/shared/base.person.entity.js';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User('testuser', 'test@example.com', '$argon2id$v=19$m=65536,t=3,p=4$hashed');
    user.id = '01234567-89ab-cdef-0123-456789abcdef';
  });

  describe('Constructor', () => {
    it('should create user with required parameters', () => {
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBe('$argon2id$v=19$m=65536,t=3,p=4$hashed');
      expect(user.roles).toEqual([Role.USER]);
    });

    it('should accept custom roles', () => {
      const adminUser = new User('admin', 'admin@example.com', 'password', [Role.ADMIN]);
      expect(adminUser.roles).toEqual([Role.ADMIN]);
    });

    it('should default isActive to true', () => {
      expect(user.isActive).toBe(true);
    });

    it('should default isVerified to false', () => {
      expect(user.isVerified).toBe(false);
    });

    it('should default emailVerified to false', () => {
      expect(user.emailVerified).toBe(false);
    });

    it('should default profileCompleteness to 25', () => {
      expect(user.profileCompleteness).toBe(25);
    });
  });

  describe('canPurchase', () => {
    it('should return false if user is not verified', () => {
      user.isVerified = false;
      expect(user.canPurchase()).toBe(false);
    });

    it('should return false if user has no personal info', () => {
      user.isVerified = true;
      user.person = undefined;
      expect(user.canPurchase()).toBe(false);
    });

    it('should return true if user is verified and has complete personal info', () => {
      user.isVerified = true;

      // Mock person with complete data
      const mockPerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
      } as any;

      user.person = mockPerson;

      expect(user.canPurchase()).toBe(true);
    });

    it('should return false if personal info is incomplete', () => {
      user.isVerified = true;

      // Mock person with incomplete data (missing phone)
      const mockPerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '', // Empty phone
        address: 'Test Address'
      } as any;

      user.person = mockPerson;

      expect(user.canPurchase()).toBe(false);
    });
  });

  describe('calculateProfileCompleteness', () => {
    it('should return 25% for newly created user', () => {
      user.isVerified = false;
      user.person = undefined;
      expect(user.calculateProfileCompleteness()).toBe(25);
    });

    it('should return 50% if user is verified but no personal info', () => {
      user.isVerified = true;
      user.person = undefined;
      expect(user.calculateProfileCompleteness()).toBe(50);
    });

    it('should return 75% if user has personal info but not verified', () => {
      user.isVerified = false;

      const mockPerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
      } as any;

      user.person = mockPerson;

      expect(user.calculateProfileCompleteness()).toBe(75);
    });

    it('should return 100% if user is verified and has complete personal info', () => {
      user.isVerified = true;

      const mockPerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
      } as any;

      user.person = mockPerson;

      expect(user.calculateProfileCompleteness()).toBe(100);
    });

    it('should not exceed 100%', () => {
      user.isVerified = true;

      const mockPerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
      } as any;

      user.person = mockPerson;

      const completeness = user.calculateProfileCompleteness();
      expect(completeness).toBeLessThanOrEqual(100);
    });
  });

  describe('hasPersonalInfo getter', () => {
    it('should return false if person is undefined', () => {
      user.person = undefined;
      expect(user.hasPersonalInfo).toBe(false);
    });

    it('should return false if personal info is incomplete', () => {
      const incompletePerson = {
        dni: '12345678',
        name: 'Test User',
        email: '', // Missing email
        phone: '',  // Missing phone
        address: 'Test Address'
      } as any;

      user.person = incompletePerson;
      expect(user.hasPersonalInfo).toBe(false);
    });

    it('should return true if all personal info fields are present', () => {
      const completePerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
      } as any;

      user.person = completePerson;
      expect(user.hasPersonalInfo).toBe(true);
    });
  });

  describe('toDTO', () => {
    it('should return user DTO without password', () => {
      const dto = user.toDTO();

      expect(dto).toHaveProperty('id', user.id);
      expect(dto).toHaveProperty('username', user.username);
      expect(dto).toHaveProperty('email', user.email);
      expect(dto).toHaveProperty('roles', user.roles);
      expect(dto).toHaveProperty('isActive', user.isActive);
      expect(dto).toHaveProperty('isVerified', user.isVerified);
      expect(dto).toHaveProperty('emailVerified', user.emailVerified);
      expect(dto).not.toHaveProperty('password');
    });

    it('should include profile completeness in DTO', () => {
      const dto = user.toDTO();

      expect(dto).toHaveProperty('profileCompleteness');
      expect(typeof dto.profileCompleteness).toBe('number');
    });

    it('should include hasPersonalInfo in DTO', () => {
      const dto = user.toDTO();

      expect(dto).toHaveProperty('hasPersonalInfo');
      expect(typeof dto.hasPersonalInfo).toBe('boolean');
    });

    it('should include person data if present', () => {
      const mockPerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
      } as any;

      user.person = mockPerson;

      const dto = user.toDTO();

      expect(dto.person).toBeTruthy();
      expect(dto.person?.dni).toBe('12345678');
      expect(dto.person?.name).toBe('Test User');
    });

    it('should return null for person if not present', () => {
      user.person = undefined;

      const dto = user.toDTO();

      expect(dto.person).toBeNull();
    });

    it('should include timestamps', () => {
      const dto = user.toDTO();

      expect(dto).toHaveProperty('createdAt');
      expect(dto).toHaveProperty('updatedAt');
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
    });
  });

  describe('Role validation', () => {
    it('should have valid role enum values', () => {
      expect(Role.ADMIN).toBe('ADMIN');
      expect(Role.CLIENT).toBe('CLIENT');
      expect(Role.USER).toBe('USER');
      expect(Role.PARTNER).toBe('PARTNER');
      expect(Role.DISTRIBUTOR).toBe('DISTRIBUTOR');
      expect(Role.AUTHORITY).toBe('AUTHORITY');
    });

    it('should allow multiple roles', () => {
      user.roles = [Role.USER, Role.CLIENT];
      expect(user.roles).toHaveLength(2);
      expect(user.roles).toContain(Role.USER);
      expect(user.roles).toContain(Role.CLIENT);
    });

    it('should allow single role', () => {
      user.roles = [Role.ADMIN];
      expect(user.roles).toHaveLength(1);
      expect(user.roles).toContain(Role.ADMIN);
    });
  });

  describe('User properties', () => {
    it('should have required properties', () => {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('roles');
      expect(user).toHaveProperty('isActive');
      expect(user).toHaveProperty('isVerified');
      expect(user).toHaveProperty('emailVerified');
    });

    it('should have timestamp properties', () => {
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('canPerformAction', () => {
    it('should return false for purchase action if not verified', () => {
      user.isVerified = false;
      expect(user.canPerformAction('purchase')).toBe(false);
    });

    it('should return false for purchase action if no personal info', () => {
      user.isVerified = true;
      user.person = undefined;
      expect(user.canPerformAction('purchase')).toBe(false);
    });

    it('should return false for purchase action if profile completeness is not 100%', () => {
      user.isVerified = true;
      user.profileCompleteness = 75;

      const mockPerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
      } as any;

      user.person = mockPerson;

      expect(user.canPerformAction('purchase')).toBe(false);
    });

    it('should return true for purchase action if all conditions met', () => {
      user.isVerified = true;
      user.profileCompleteness = 100;

      const mockPerson = {
        dni: '12345678',
        name: 'Test User',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Test Address'
      } as any;

      user.person = mockPerson;

      expect(user.canPerformAction('purchase')).toBe(true);
    });

    it('should return false for admin action if profile completeness is not 100%', () => {
      user.profileCompleteness = 75;
      expect(user.canPerformAction('admin')).toBe(false);
    });

    it('should return true for admin action if profile completeness is 100%', () => {
      user.profileCompleteness = 100;
      expect(user.canPerformAction('admin')).toBe(true);
    });
  });
});
