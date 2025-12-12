import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock dependencies BEFORE importing middleware
jest.mock('../../../src/shared/db/orm.js', () => ({
  orm: {
    em: {
      fork: jest.fn()
    }
  }
}));

jest.mock('../../../src/config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key'
  }
}));

const mockLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

jest.mock('../../../src/shared/utils/logger.js', () => mockLogger);

jest.mock('jsonwebtoken');

// Import AFTER mocks
import { authMiddleware, rolesMiddleware } from '../../../src/modules/auth/auth.middleware.js';
import { Role } from '../../../src/modules/auth/user/user.entity.js';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      cookies: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any
    };

    mockNext = jest.fn() as NextFunction;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate user with valid token', () => {
      mockRequest.cookies = { access_token: 'valid_token' };
      const mockPayload = {
        id: 123,
        roles: [Role.USER]
      };

      (jwt.verify as any).mockReturnValue(mockPayload);

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test-secret-key');
      expect((mockRequest as any).user).toEqual({
        id: 123,
        roles: [Role.USER]
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if no token provided', () => {
      mockRequest.cookies = {};

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Not authenticated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      mockRequest.cookies = { access_token: 'invalid_token' };
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', () => {
      mockRequest.cookies = { access_token: 'expired_token' };
      (jwt.verify as any).mockImplementation(() => {
        const error: any = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach user with multiple roles to request', () => {
      mockRequest.cookies = { access_token: 'valid_token' };
      const mockPayload = {
        id: 456,
        roles: [Role.USER, Role.ADMIN, Role.PARTNER]
      };

      (jwt.verify as any).mockReturnValue(mockPayload);

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).user).toEqual({
        id: 456,
        roles: [Role.USER, Role.ADMIN, Role.PARTNER]
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle malformed JWT token', () => {
      mockRequest.cookies = { access_token: 'malformed.token' };
      (jwt.verify as any).mockImplementation(() => {
        const error: any = new Error('jwt malformed');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing cookies object', () => {
      delete mockRequest.cookies;

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Not authenticated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('rolesMiddleware', () => {
    beforeEach(() => {
      (mockRequest as any).user = {
        id: 123,
        roles: [Role.USER]
      };
    });

    it('should allow access if user has required role', () => {
      const middleware = rolesMiddleware([Role.USER, Role.ADMIN]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access if user has one of multiple required roles', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: [Role.USER, Role.DISTRIBUTOR]
      };

      const middleware = rolesMiddleware([Role.ADMIN, Role.DISTRIBUTOR, Role.PARTNER]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access if user does not have required role', () => {
      const middleware = rolesMiddleware([Role.ADMIN]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'You do not have permission to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      delete (mockRequest as any).user;

      const middleware = rolesMiddleware([Role.USER]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Not authenticated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if user has no roles', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: undefined
      };

      const middleware = rolesMiddleware([Role.USER]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Not authenticated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow ADMIN role to access admin-only routes', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: [Role.ADMIN]
      };

      const middleware = rolesMiddleware([Role.ADMIN]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle PARTNER role correctly', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: [Role.PARTNER]
      };

      const middleware = rolesMiddleware([Role.PARTNER, Role.ADMIN]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle AUTHORITY role correctly', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: [Role.AUTHORITY]
      };

      const middleware = rolesMiddleware([Role.AUTHORITY]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle DISTRIBUTOR role correctly', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: [Role.DISTRIBUTOR]
      };

      const middleware = rolesMiddleware([Role.DISTRIBUTOR, Role.PARTNER]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user has only unmatched roles', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: [Role.USER, Role.DISTRIBUTOR]
      };

      const middleware = rolesMiddleware([Role.ADMIN, Role.PARTNER]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'You do not have permission to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access with user having multiple roles including required', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: [Role.USER, Role.ADMIN, Role.PARTNER, Role.DISTRIBUTOR]
      };

      const middleware = rolesMiddleware([Role.ADMIN]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should work with empty roles array for user (edge case)', () => {
      (mockRequest as any).user = {
        id: 123,
        roles: []
      };

      const middleware = rolesMiddleware([Role.USER]);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'You do not have permission to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
