import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import argon2 from 'argon2';
import { ClientController } from '../../../src/modules/client/client.controller.js';
import { Client } from '../../../src/modules/client/client.entity.js';
import { User, Role } from '../../../src/modules/auth/user/user.entity.js';
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

// Mock search utility functions
jest.mock('../../../src/shared/utils/search.util.js', () => ({
  searchEntityWithPagination: jest.fn((req: any, res: any) => {
    res.status(200).json({ success: true, data: [] });
    return res;
  }),
  searchEntityWithPaginationCached: jest.fn((req: any, res: any) => {
    res.status(200).json({ success: true, data: [] });
    return res;
  })
}));

// Mock validation middleware
jest.mock('../../../src/shared/middleware/validation.middleware.js', () => ({
  validateQueryParams: jest.fn(() => ({ page: 1, limit: 10 }))
}));

import { validateQueryParams } from '../../../src/shared/middleware/validation.middleware.js';
import { searchEntityWithPagination, searchEntityWithPaginationCached } from '../../../src/shared/utils/search.util.js';

// ============================================================================
// TEST SUITE
// ============================================================================

describe('ClientController', () => {
  let clientController: ClientController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockEntityManager: any;

  beforeEach(() => {
    clientController = new ClientController();

    mockRequest = {
      params: {},
      query: {},
      body: {}
    };

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

    // Setup chaining for status().json().set()
    (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
    (mockResponse.json as jest.Mock).mockReturnValue(mockResponse);
    (mockResponse.set as jest.Mock).mockReturnValue(mockResponse);

    // Mock entity manager
    mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      persistAndFlush: jest.fn(),
      removeAndFlush: jest.fn(),
      assign: jest.fn(),
      flush: jest.fn(),
      fork: jest.fn().mockReturnThis()
    };

    (orm.em.fork as jest.Mock).mockReturnValue(mockEntityManager);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // searchClients
  // ──────────────────────────────────────────────────────────────────────────

  describe('searchClients', () => {
    it('should call searchEntityWithPaginationCached with correct params', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({ q: 'test', page: 1, limit: 10 });

      await clientController.searchClients(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPaginationCached).toHaveBeenCalledWith(
        mockRequest as any,
        mockResponse as any,
        Client,
        expect.objectContaining({
          entityName: 'client',
          searchFields: 'name'
        })
      );
    });

    it('should return early if validation fails', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue(null);

      await clientController.searchClients(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPaginationCached).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // createClient
  // ──────────────────────────────────────────────────────────────────────────

  describe('createClient', () => {
    it('should create client successfully without user', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Client',
        email: 'test@client.com',
        address: 'Test Address',
        phone: '123456789'
      };

      mockEntityManager.findOne.mockResolvedValue(null);
      const mockPerson = { dni: '12345678', name: 'Test Client' };
      const mockClient = {
        dni: '12345678',
        name: 'Test Client',
        toDTO: jest.fn().mockReturnValue({ dni: '12345678', name: 'Test Client' })
      };

      mockEntityManager.create
        .mockReturnValueOnce(mockPerson)
        .mockReturnValueOnce(mockClient);

      await clientController.createClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockPerson);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Client created successfully'
        })
      );
    });

    it('should create client with user when credentials provided', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Client',
        email: 'test@client.com',
        username: 'testuser',
        password: 'password123'
      };

      (argon2.hash as any).mockResolvedValue('hashed_password');

      const mockPerson = { dni: '12345678', name: 'Test Client' };
      const mockClient = {
        dni: '12345678',
        name: 'Test Client',
        toDTO: jest.fn().mockReturnValue({ dni: '12345678' })
      };

      // Mock findOne calls:
      // 1. Check existing client (null = no existe)
      // 2. Check existing username (null = no existe)
      // 3. Find BasePersonEntity (null = crear nuevo)
      // 4. Find User by person.dni (null = crear nuevo)
      mockEntityManager.findOne
        .mockResolvedValueOnce(null)  // No existing client
        .mockResolvedValueOnce(null)  // No existing username
        .mockResolvedValueOnce(null)  // No existing person
        .mockResolvedValueOnce(null); // No existing user

      mockEntityManager.create
        .mockReturnValueOnce(mockPerson)
        .mockReturnValueOnce(mockClient);

      // Mock persistAndFlush to assign id to User after persist
      mockEntityManager.persistAndFlush.mockImplementation((entity: any) => {
        if (entity && !entity.id && entity.username) {
          entity.id = 'user-1'; // Assign id to user after persist
        }
        return Promise.resolve();
      });

      await clientController.createClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(argon2.hash).toHaveBeenCalledWith('password123');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if mandatory data missing', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678'
        // name and email missing
      };

      await clientController.createClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Missing mandatory data')
        })
      );
    });

    it('should return 409 if client with DNI already exists', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Client',
        email: 'test@client.com'
      };

      const existingClient = { dni: '12345678', name: 'Existing' };
      mockEntityManager.findOne.mockResolvedValue(existingClient);

      await clientController.createClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('client with that DNI already exists')
        })
      );
    });

    it('should return 409 if username already exists', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Client',
        email: 'test@client.com',
        username: 'existinguser',
        password: 'password123'
      };

      const existingUser = { username: 'existinguser' };
      mockEntityManager.findOne
        .mockResolvedValueOnce(null) // No existing client
        .mockResolvedValueOnce(existingUser); // Existing user

      await clientController.createClient(
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

    it('should handle database errors gracefully', async () => {
      mockResponse.locals!.validated.body = {
        dni: '12345678',
        name: 'Test Client',
        email: 'test@client.com'
      };

      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await clientController.createClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Error creating client')
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getAllClients
  // ──────────────────────────────────────────────────────────────────────────

  describe('getAllClients', () => {
    it('should call searchEntityWithPagination with correct params', async () => {
      await clientController.getAllClients(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalledWith(
        mockRequest as any,
        mockResponse as any,
        Client,
        expect.objectContaining({
          entityName: 'client',
          populate: expect.arrayContaining(['user', 'purchases'])
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getOneClientByDni
  // ──────────────────────────────────────────────────────────────────────────

  describe('getOneClientByDni', () => {
    it('should return client successfully', async () => {
      mockRequest.params = { dni: '12345678' };

      const mockClient = {
        dni: '12345678',
        name: 'Test Client',
        toDetailedDTO: jest.fn().mockReturnValue({
          dni: '12345678',
          name: 'Test Client'
        })
      };

      mockEntityManager.findOne.mockResolvedValue(mockClient);

      await clientController.getOneClientByDni(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Client,
        { dni: '12345678' },
        expect.objectContaining({ populate: expect.arrayContaining(['user', 'purchases']) })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Client found')
        })
      );
    });

    it('should return 404 if client not found', async () => {
      mockRequest.params = { dni: '99999999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await clientController.getOneClientByDni(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Client')
        })
      );
    });

    it('should handle database errors', async () => {
      mockRequest.params = { dni: '12345678' };
      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await clientController.getOneClientByDni(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should trim DNI parameter', async () => {
      mockRequest.params = { dni: '  12345678  ' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await clientController.getOneClientByDni(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Client,
        { dni: '12345678' },
        expect.any(Object)
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // patchUpdateClient
  // ──────────────────────────────────────────────────────────────────────────

  describe('patchUpdateClient', () => {
    it('should update client successfully', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = {
        name: 'Updated Name',
        email: 'updated@client.com'
      };

      const mockClient = {
        dni: '12345678',
        name: 'Old Name',
        toDTO: jest.fn().mockReturnValue({
          dni: '12345678',
          name: 'Updated Name'
        })
      };

      mockEntityManager.findOne.mockResolvedValue(mockClient);

      await clientController.patchUpdateClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.assign).toHaveBeenCalledWith(mockClient, {
        name: 'Updated Name',
        email: 'updated@client.com'
      });
      expect(mockEntityManager.flush).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('updated')
        })
      );
    });

    it('should return 404 if client not found', async () => {
      mockRequest.params = { dni: '99999999' };
      mockResponse.locals!.validated.body = { name: 'Updated Name' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await clientController.patchUpdateClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = { name: 'Updated Name' };
      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await clientController.patchUpdateClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // deleteClient
  // ──────────────────────────────────────────────────────────────────────────

  describe('deleteClient', () => {
    it('should delete client successfully', async () => {
      mockRequest.params = { dni: '12345678' };

      const mockClient = {
        dni: '12345678',
        name: 'Test Client'
      };

      mockEntityManager.findOne.mockResolvedValue(mockClient);

      await clientController.deleteClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.removeAndFlush).toHaveBeenCalledWith(mockClient);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Test Client')
        })
      );
    });

    it('should return 404 if client not found', async () => {
      mockRequest.params = { dni: '99999999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await clientController.deleteClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockEntityManager.removeAndFlush).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockRequest.params = { dni: '12345678' };
      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await clientController.deleteClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should trim DNI parameter before deletion', async () => {
      mockRequest.params = { dni: '  12345678  ' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await clientController.deleteClient(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Client,
        { dni: '12345678' }
      );
    });
  });
});
