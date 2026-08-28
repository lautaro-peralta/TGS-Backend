import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { AuthController } from '../../../src/modules/auth/auth.controller.js';
import { User, Role } from '../../../src/modules/auth/user/user.entity.js';
import { RefreshToken } from '../../../src/modules/auth/refreshToken.entity.js';
import { EmailVerification } from '../../../src/modules/auth/emailVerification/emailVerification.entity.js';
import { orm } from '../../../src/shared/db/orm.js';
import { env } from '../../../src/config/env.js';
import { emailService } from '../../../src/shared/services/email.service.js';

// Mock dependencies
jest.mock('../../../src/shared/db/orm.js', () => ({
  orm: {
    em: {
      fork: jest.fn()
    }
  }
}));

jest.mock('../../../src/config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    EMAIL_VERIFICATION_REQUIRED: false
  }
}));

jest.mock('../../../src/shared/services/email.service.js', () => ({
  emailService: {
    sendVerificationEmail: jest.fn()
  }
}));

jest.mock('argon2');
jest.mock('jsonwebtoken');

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockEntityManager: any;

  beforeEach(() => {
    authController = new AuthController();

    mockRequest = {
      body: {},
      cookies: {},
      ip: '127.0.0.1',
      get: jest.fn((header: string) => 'test-user-agent') as any
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
      cookie: jest.fn().mockReturnThis() as any,
      clearCookie: jest.fn().mockReturnThis() as any,
      set: jest.fn().mockReturnThis() as any
    };

    mockNext = jest.fn() as NextFunction;

    // Mock entity manager
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      persistAndFlush: jest.fn(),
      removeAndFlush: jest.fn(),
      nativeDelete: jest.fn(),
      flush: jest.fn(),
      create: jest.fn(),
      fork: jest.fn().mockReturnThis()
    };

    (orm.em.fork as jest.Mock).mockReturnValue(mockEntityManager);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const validRegistrationData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!'
    };

    beforeEach(() => {
      mockRequest.body = validRegistrationData;
      (argon2.hash as any).mockResolvedValue('hashed_password');
    });

    it('should successfully register a new user', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, {
        username: 'testuser'
      });
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should return 409 if username already exists', async () => {
      const existingUser = new User('testuser', 'other@example.com', 'password');
      mockEntityManager.findOne.mockResolvedValueOnce(existingUser);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Username is already registered'
        })
      );
    });

    it('should return 409 if email already exists and is verified', async () => {
      const existingUser = new User('otheruser', 'test@example.com', 'password');
      existingUser.emailVerified = true;

      mockEntityManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email is already registered'
        })
      );
    });

    it('should reclaim unverified email account', async () => {
      const existingUser = new User('olduser', 'test@example.com', 'password');
      existingUser.emailVerified = false;
      existingUser.createdAt = new Date(Date.now() - 1000 * 60 * 60);
      existingUser.id = 'old-user-id';

      mockEntityManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockEntityManager.nativeDelete).toHaveBeenCalledWith(EmailVerification, {
        email: 'test@example.com'
      });
      expect(mockEntityManager.removeAndFlush).toHaveBeenCalledWith(existingUser);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should hash password with argon2', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(argon2.hash).toHaveBeenCalledWith('Password123!');
    });

    it('should create user with USER role by default', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      let capturedUser: User | null = null;

      mockEntityManager.persistAndFlush.mockImplementation((user: User) => {
        capturedUser = user;
        return Promise.resolve();
      });

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(capturedUser).not.toBeNull();
      expect(capturedUser!.roles).toEqual([Role.USER]);
    });

    it('should call next with error when exception occurs', async () => {
      const error = new Error('Database error');
      mockEntityManager.findOne.mockRejectedValue(error);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!'
    };

    let mockUser: User;

    beforeEach(() => {
      mockRequest.body = validLoginData;
      mockUser = new User('testuser', 'test@example.com', 'hashed_password');
      mockUser.id = 'user-id-123';
      mockUser.emailVerified = true;
      mockUser.roles = [Role.USER];

      (argon2.verify as any).mockResolvedValue(true);
      (argon2.hash as any).mockResolvedValue('hashed_refresh_token');
      (jwt.sign as any).mockReturnValue('mock_jwt_token');
    });

    it('should successfully login with valid credentials', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.create.mockReturnValue({
        token: 'hashed_refresh_token',
        user: mockUser,
        expiresAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-user-agent',
        createdAt: new Date(),
        isRevoked: false
      });

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, {
        $or: [{ email: 'test@example.com' }, { username: 'test@example.com' }]
      });
      expect(argon2.verify).toHaveBeenCalledWith('hashed_password', 'Password123!');
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'mock_jwt_token', expect.any(Object));
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful'
        })
      );
    });

    it('should return 401 for invalid email', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid credentials'
        })
      );
    });

    it('should return 401 for invalid password', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      (argon2.verify as any).mockResolvedValue(false);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid credentials'
        })
      );
    });

    it('should update lastLoginAt timestamp', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.create.mockReturnValue({});

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUser.lastLoginAt).toBeInstanceOf(Date);
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should create refresh token in database', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.create.mockReturnValue({});

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        RefreshToken,
        expect.objectContaining({
          token: 'hashed_refresh_token',
          user: mockUser,
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
          isRevoked: false
        })
      );
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalled();
    });

    it('should call next with error when exception occurs', async () => {
      const error = new Error('Database error');
      mockEntityManager.findOne.mockRejectedValue(error);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockRequest.cookies = {
        refresh_token: 'test_refresh_token'
      };
    });

    it('should successfully logout and clear cookies', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await authController.logout(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout successful'
        })
      );
    });

    it('should revoke refresh token if found', async () => {
      const mockToken = {
        token: 'hashed_refresh_token',
        revoke: jest.fn(),
        isActive: jest.fn().mockReturnValue(true)
      };

      mockEntityManager.find.mockResolvedValue([mockToken]);
      (argon2.verify as any).mockResolvedValue(true);

      await authController.logout(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(argon2.verify).toHaveBeenCalledWith('hashed_refresh_token', 'test_refresh_token');
      expect(mockToken.revoke).toHaveBeenCalled();
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should handle logout without refresh token', async () => {
      mockRequest.cookies = {};
      mockEntityManager.find.mockResolvedValue([]);

      await authController.logout(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should clear cookies even if database error occurs', async () => {
      mockEntityManager.find.mockRejectedValue(new Error('Database error'));

      await authController.logout(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout successful'
        })
      );
    });
  });

  describe('refresh', () => {
    let mockUser: User;
    let mockRefreshToken: any;

    beforeEach(() => {
      mockUser = new User('testuser', 'test@example.com', 'hashed_password');
      mockUser.id = 'user-id-123';
      mockUser.roles = [Role.USER];

      mockRefreshToken = {
        token: 'hashed_refresh_token',
        user: mockUser,
        revoke: jest.fn(),
        isActive: jest.fn().mockReturnValue(true)
      };

      mockRequest.cookies = {
        refresh_token: 'test_refresh_token'
      };

      (argon2.verify as any).mockResolvedValue(true);
      (argon2.hash as any).mockResolvedValue('new_hashed_refresh_token');
      (jwt.sign as any).mockReturnValue('new_mock_jwt_token');
    });

    it('should successfully refresh tokens', async () => {
      mockEntityManager.find.mockResolvedValue([mockRefreshToken]);
      mockEntityManager.create.mockReturnValue({});

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.find).toHaveBeenCalledWith(RefreshToken, {}, { populate: ['user'] });
      expect(argon2.verify).toHaveBeenCalledWith('hashed_refresh_token', 'test_refresh_token');
      expect(mockRefreshToken.revoke).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'new_mock_jwt_token', expect.any(Object));
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token refreshed successfully'
        })
      );
    });

    it('should return 401 if refresh token not in cookies', async () => {
      mockRequest.cookies = {};

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Refresh token not found'
        })
      );
    });

    it('should return 401 if refresh token not found in database', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired refresh token'
        })
      );
    });

    it('should return 401 if refresh token is not active', async () => {
      mockRefreshToken.isActive.mockReturnValue(false);
      mockEntityManager.find.mockResolvedValue([mockRefreshToken]);

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired refresh token'
        })
      );
    });

    it('should create new refresh token (token rotation)', async () => {
      mockEntityManager.find.mockResolvedValue([mockRefreshToken]);
      mockEntityManager.create.mockReturnValue({});

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        RefreshToken,
        expect.objectContaining({
          token: 'new_hashed_refresh_token',
          user: mockUser,
          isRevoked: false
        })
      );
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockEntityManager.find.mockRejectedValue(error);

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to refresh token'
        })
      );
    });
  });
});
