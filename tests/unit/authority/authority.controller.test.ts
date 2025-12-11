import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import argon2 from 'argon2';
import { AuthorityController } from '../../../src/modules/authority/authority.controller.js';
import { Authority } from '../../../src/modules/authority/authority.entity.js';
import { Zone } from '../../../src/modules/zone/zone.entity.js';
import { User, Role } from '../../../src/modules/auth/user/user.entity.js';
import { Bribe } from '../../../src/modules/bribe/bribe.entity.js';
import { BasePersonEntity } from '../../../src/shared/base.person.entity.js';
import { orm } from '../../../src/shared/db/orm.js';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../../../src/shared/db/orm.js', () => ({
  orm: {
    em: {
      fork: jest.fn()
    }
  }
}));

jest.mock('../../../src/shared/utils/logger.js', () => {
  const mockFn = jest.fn();
  return {
    __esModule: true,
    default: {
      debug: mockFn,
      warn: mockFn,
      error: mockFn,
      info: mockFn
    }
  };
});

jest.mock('argon2');

// Mock search utility
jest.mock('../../../src/shared/utils/search.util.js', () => ({
  searchEntityWithPagination: jest.fn((req: any, res: any) => {
    res.status(200).json({ success: true, data: [] });
    return res;
  })
}));

// Mock validation middleware
jest.mock('../../../src/shared/middleware/validation.middleware.js', () => ({
  validateQueryParams: jest.fn(() => ({}))
}));

import { validateQueryParams } from '../../../src/shared/middleware/validation.middleware.js';
import { searchEntityWithPagination } from '../../../src/shared/utils/search.util.js';
import logger from '../../../src/shared/utils/logger.js';

// ============================================================================
// TEST SUITE
// ============================================================================

describe('AuthorityController', () => {
  let authorityController: AuthorityController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockEntityManager: any;

  beforeEach(() => {
    authorityController = new AuthorityController();

    mockRequest = {
      params: {},
      query: {},
      body: {}
    } as any;

    mockResponse = {
      status: jest.fn() as any,
      json: jest.fn() as any,
      set: jest.fn() as any,
      locals: {
        validated: {
          body: {},
          params: {}
        }
      }
    };

    // Setup chaining
    (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
    (mockResponse.json as jest.Mock).mockReturnValue(mockResponse);
    (mockResponse.set as jest.Mock).mockReturnValue(mockResponse);

    // Mock entity manager
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      getReference: jest.fn(),
      persistAndFlush: jest.fn(),
      removeAndFlush: jest.fn(),
      flush: jest.fn(),
      fork: jest.fn().mockReturnThis()
    };

    (orm.em.fork as jest.Mock).mockReturnValue(mockEntityManager);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // searchAuthorities
  // ──────────────────────────────────────────────────────────────────────────

  describe('searchAuthorities', () => {
    it('should call searchEntityWithPagination with correct params', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({});

      await authorityController.searchAuthorities(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalledWith(
        mockRequest as any,
        mockResponse as any,
        Authority,
        expect.objectContaining({
          entityName: 'authority',
          searchFields: 'name'
        })
      );
    });

    it('should filter by zone', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({ zone: 'Zone 1' });

      await authorityController.searchAuthorities(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalled();
    });

    it('should filter by rank', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({ rank: 5 });

      await authorityController.searchAuthorities(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalled();
    });

    it('should return early if validation fails', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue(null);

      await authorityController.searchAuthorities(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getAuthorityBribes
  // ──────────────────────────────────────────────────────────────────────────

  describe('getAuthorityBribes', () => {
    it('should return bribes for ADMIN user', async () => {
      mockRequest.params = { dni: '12345678' };
      (mockRequest as any).user = { roles: [Role.ADMIN], dni: 'admin-dni' };
      (validateQueryParams as jest.Mock).mockReturnValue({});

      const mockAuthority = { id: 'auth-1', dni: '12345678' };
      mockEntityManager.findOne.mockResolvedValue(mockAuthority);

      await authorityController.getAuthorityBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalled();
    });

    it('should return bribes for AUTHORITY viewing own bribes', async () => {
      mockRequest.params = { dni: '12345678' };
      (mockRequest as any).user = { roles: [Role.AUTHORITY], dni: '12345678' };
      (validateQueryParams as jest.Mock).mockReturnValue({});

      const mockAuthority = { id: 'auth-1', dni: '12345678' };
      mockEntityManager.findOne.mockResolvedValue(mockAuthority);

      await authorityController.getAuthorityBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalled();
    });

    it('should return 403 for non-AUTHORITY/ADMIN user', async () => {
      mockRequest.params = { dni: '12345678' };
      (mockRequest as any).user = { roles: [Role.USER], dni: 'user-dni' };
      (validateQueryParams as jest.Mock).mockReturnValue({});

      await authorityController.getAuthorityBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('not allowed')
        })
      );
    });

    it('should return 403 for AUTHORITY viewing another authority bribes', async () => {
      mockRequest.params = { dni: '12345678' };
      (mockRequest as any).user = { roles: [Role.AUTHORITY], dni: '87654321' };
      (validateQueryParams as jest.Mock).mockReturnValue({});

      await authorityController.getAuthorityBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('another authority')
        })
      );
    });

    it('should return 404 if authority not found', async () => {
      mockRequest.params = { dni: '99999999' };
      (mockRequest as any).user = { roles: [Role.ADMIN], dni: 'admin-dni' };
      (validateQueryParams as jest.Mock).mockReturnValue({});

      mockEntityManager.findOne.mockResolvedValue(null);

      await authorityController.getAuthorityBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return early if validation fails', async () => {
      (mockRequest as any).user = { roles: [Role.ADMIN] };
      (validateQueryParams as jest.Mock).mockReturnValue(null);

      await authorityController.getAuthorityBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockRequest.params = { dni: '12345678' };
      (mockRequest as any).user = { roles: [Role.ADMIN], dni: 'admin-dni' };
      (validateQueryParams as jest.Mock).mockReturnValue({});

      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await authorityController.getAuthorityBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // createAuthority
  // ──────────────────────────────────────────────────────────────────────────

  describe('createAuthority', () => {
    it('should create authority successfully without user', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Authority',
        email: 'auth@test.com',
        rank: 5,
        zoneId: 'zone-1'
      };

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.count.mockResolvedValue(1); // Zone exists

      const mockPerson = { dni: '12345678' };
      const mockAuthority = {
        id: 'auth-1',
        dni: '12345678',
        toDTO: jest.fn().mockReturnValue({ id: 'auth-1', dni: '12345678' })
      };

      mockEntityManager.create
        .mockReturnValueOnce(mockPerson)
        .mockReturnValueOnce(mockAuthority);

      await authorityController.createAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Authority created successfully'
        })
      );
    });

    it('should create authority with user when credentials provided', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Authority',
        email: 'auth@test.com',
        rank: 5,
        zoneId: 'zone-1',
        username: 'authuser',
        password: 'password123'
      };

      (argon2.hash as any).mockResolvedValue('hashed_password');

      const mockPerson = { dni: '12345678' };
      const mockAuthority = {
        id: 'auth-1',
        toDTO: jest.fn().mockReturnValue({ id: 'auth-1' })
      };

      // Mock findOne calls in order:
      // 1. Check existing authority by DNI (null = no existe)
      // 2. Check existing username (null = no existe)
      // 3. Find BasePersonEntity (null = crear nuevo)
      // 4. Find User by person.dni (null = crear nuevo)
      mockEntityManager.findOne
        .mockResolvedValueOnce(null)  // No existing authority
        .mockResolvedValueOnce(null)  // No existing username
        .mockResolvedValueOnce(null)  // No existing person
        .mockResolvedValueOnce(null); // No existing user

      mockEntityManager.count.mockResolvedValue(1); // Zone exists

      mockEntityManager.create
        .mockReturnValueOnce(mockPerson)
        .mockReturnValueOnce(mockAuthority);

      // Mock persistAndFlush to assign id to User after persist
      mockEntityManager.persistAndFlush.mockImplementation((entity: any) => {
        if (entity && !entity.id && entity.username) {
          entity.id = 'user-1'; // Assign id to user after persist
        }
        return Promise.resolve();
      });

      await authorityController.createAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(argon2.hash).toHaveBeenCalledWith('password123');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authority and user created successfully'
        })
      );
    });

    it('should return 409 if DNI already exists', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Authority',
        email: 'auth@test.com',
        rank: 5,
        zoneId: 'zone-1'
      };

      const existingAuthority = { dni: '12345678' };
      mockEntityManager.findOne.mockResolvedValue(existingAuthority);

      await authorityController.createAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('DNI already exists')
        })
      );
    });

    it('should return 409 if username already exists', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Authority',
        email: 'auth@test.com',
        rank: 5,
        zoneId: 'zone-1',
        username: 'existinguser',
        password: 'password123'
      };

      const existingUser = { username: 'existinguser' };
      mockEntityManager.findOne
        .mockResolvedValueOnce(null) // No existing authority
        .mockResolvedValueOnce(existingUser); // Existing user

      await authorityController.createAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('username already exists')
        })
      );
    });

    it('should return 404 if zone not found', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Authority',
        email: 'auth@test.com',
        rank: 5,
        zoneId: 'invalid-zone'
      };

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.count.mockResolvedValue(0); // Zone doesn't exist

      await authorityController.createAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Zone')
        })
      );
    });

    it('should handle database errors', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Authority',
        email: 'auth@test.com',
        rank: 5,
        zoneId: 'zone-1'
      };

      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await authorityController.createAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getAllAuthorities
  // ──────────────────────────────────────────────────────────────────────────

  describe('getAllAuthorities', () => {
    it('should call searchEntityWithPagination', async () => {
      await authorityController.getAllAuthorities(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalledWith(
        mockRequest as any,
        mockResponse as any,
        Authority,
        expect.objectContaining({
          entityName: 'authority'
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getOneAuthorityByDni
  // ──────────────────────────────────────────────────────────────────────────

  describe('getOneAuthorityByDni', () => {
    it('should return authority successfully', async () => {
      mockRequest.params = { dni: '12345678' };

      const mockAuthority = {
        id: 'auth-1',
        dni: '12345678',
        toDTO: jest.fn().mockReturnValue({ id: 'auth-1', dni: '12345678' })
      };

      mockEntityManager.findOne.mockResolvedValue(mockAuthority);

      await authorityController.getOneAuthorityByDni(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Authority found successfully'
        })
      );
    });

    it('should return 404 if authority not found', async () => {
      mockRequest.params = { dni: '99999999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await authorityController.getOneAuthorityByDni(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      mockRequest.params = { dni: '12345678' };
      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await authorityController.getOneAuthorityByDni(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // putUpdateAuthority
  // ──────────────────────────────────────────────────────────────────────────

  describe('putUpdateAuthority', () => {
    it('should update authority successfully', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = {
        name: 'Updated Name',
        rank: 10,
        zoneId: 'zone-2'
      };

      const mockAuthority = {
        id: 'auth-1',
        dni: '12345678',
        name: 'Old Name',
        rank: 5,
        toDTO: jest.fn().mockReturnValue({ id: 'auth-1', name: 'Updated Name' })
      };

      mockEntityManager.findOne.mockResolvedValue(mockAuthority);
      mockEntityManager.count.mockResolvedValue(1); // Zone exists

      await authorityController.putUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockAuthority.name).toBe('Updated Name');
      expect(mockAuthority.rank).toBe(10);
      expect(mockEntityManager.flush).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if authority not found', async () => {
      mockRequest.params = { dni: '99999999' };
      mockResponse.locals!.validated.body = {
        name: 'Updated Name',
        rank: 10,
        zoneId: 'zone-2'
      };

      mockEntityManager.findOne.mockResolvedValue(null);

      await authorityController.putUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if mandatory data missing', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = {
        name: 'Updated Name'
        // rank and zoneId missing
      };

      const mockAuthority = { id: 'auth-1' };
      mockEntityManager.findOne.mockResolvedValue(mockAuthority);

      await authorityController.putUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if zone not found', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = {
        name: 'Updated Name',
        rank: 10,
        zoneId: 'invalid-zone'
      };

      const mockAuthority = { id: 'auth-1' };
      mockEntityManager.findOne.mockResolvedValue(mockAuthority);
      mockEntityManager.count.mockResolvedValue(0); // Zone doesn't exist

      await authorityController.putUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = {
        name: 'Updated Name',
        rank: 10,
        zoneId: 'zone-2'
      };

      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await authorityController.putUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // patchUpdateAuthority
  // ──────────────────────────────────────────────────────────────────────────

  describe('patchUpdateAuthority', () => {
    it('should partially update authority successfully', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = {
        name: 'Updated Name'
      };

      const mockAuthority = {
        id: 'auth-1',
        dni: '12345678',
        name: 'Old Name',
        rank: 5,
        toDTO: jest.fn().mockReturnValue({ id: 'auth-1', name: 'Updated Name' })
      };

      mockEntityManager.findOne.mockResolvedValue(mockAuthority);

      await authorityController.patchUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockAuthority.name).toBe('Updated Name');
      expect(mockEntityManager.flush).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should update zone if zoneId provided', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = {
        zoneId: 'zone-2'
      };

      const mockZone = { id: 'zone-2', name: 'Zone 2' };
      const mockAuthority = {
        id: 'auth-1',
        zone: { id: 'zone-1' },
        toDTO: jest.fn().mockReturnValue({ id: 'auth-1' })
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockAuthority) // Authority
        .mockResolvedValueOnce(mockZone); // Zone

      await authorityController.patchUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockAuthority.zone).toBe(mockZone);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if authority not found', async () => {
      mockRequest.params = { dni: '99999999' };
      mockResponse.locals!.validated.body = { name: 'Updated Name' };

      mockEntityManager.findOne.mockResolvedValue(null);

      await authorityController.patchUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 if zone not found', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = {
        zoneId: 'invalid-zone'
      };

      const mockAuthority = { id: 'auth-1' };
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockAuthority)
        .mockResolvedValueOnce(null); // Zone not found

      await authorityController.patchUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = { name: 'Updated Name' };

      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await authorityController.patchUpdateAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // deleteAuthority
  // ──────────────────────────────────────────────────────────────────────────

  describe('deleteAuthority', () => {
    it('should delete authority successfully', async () => {
      mockRequest.params = { dni: '12345678' };

      const mockAuthority = {
        id: 'auth-1',
        dni: '12345678',
        name: 'Test Authority',
        bribes: {
          count: jest.fn().mockReturnValue(0)
        }
      };

      // Mock findOne calls in order:
      // 1. Find authority (success)
      // 2. Find BasePersonEntity (null = sin usuario asociado)
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockAuthority)
        .mockResolvedValueOnce(null); // No person

      await authorityController.deleteAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.removeAndFlush).toHaveBeenCalledWith(mockAuthority);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Test Authority')
        })
      );
    });

    it('should return 404 if authority not found', async () => {
      mockRequest.params = { dni: '99999999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await authorityController.deleteAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockEntityManager.removeAndFlush).not.toHaveBeenCalled();
    });

    it('should return 400 if authority has pending bribes', async () => {
      mockRequest.params = { dni: '12345678' };

      const mockAuthority = {
        id: 'auth-1',
        bribes: {
          count: jest.fn().mockReturnValue(5) // Has bribes
        }
      };

      mockEntityManager.findOne.mockResolvedValue(mockAuthority);

      await authorityController.deleteAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('pending bribes')
        })
      );
      expect(mockEntityManager.removeAndFlush).not.toHaveBeenCalled();
    });

    it('should remove AUTHORITY role from user before deletion', async () => {
      mockRequest.params = { dni: '12345678' };

      const mockUser = {
        id: 'user-1',
        roles: [Role.AUTHORITY, Role.USER]
      };

      const mockAuthority = {
        id: 'auth-1',
        dni: '12345678',
        name: 'Test Authority',
        bribes: {
          count: jest.fn().mockReturnValue(0)
        }
      };

      const mockPerson = { dni: '12345678' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockAuthority) // Authority
        .mockResolvedValueOnce(mockPerson) // Person
        .mockResolvedValueOnce(mockUser); // User

      await authorityController.deleteAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUser.roles).toEqual([Role.USER]);
      expect(mockEntityManager.flush).toHaveBeenCalled();
      expect(mockEntityManager.removeAndFlush).toHaveBeenCalledWith(mockAuthority);
    });

    it('should handle database errors', async () => {
      mockRequest.params = { dni: '12345678' };
      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await authorityController.deleteAuthority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
