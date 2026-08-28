// ============================================================================
// IMPORTS
// ============================================================================
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { SaleController } from '../../../src/modules/sale/sale.controller.js';
import { orm } from '../../../src/shared/db/orm.js';
import { searchEntityWithPaginationCached } from '../../../src/shared/utils/search.util.js';
import { validateQueryParams, validateBusinessRules } from '../../../src/shared/middleware/validation.middleware.js';
import { Sale } from '../../../src/modules/sale/sale.entity.js';
import { Client } from '../../../src/modules/client/client.entity.js';
import { Distributor } from '../../../src/modules/distributor/distributor.entity.js';
import { Product } from '../../../src/modules/product/product.entity.js';
import { Detail } from '../../../src/modules/sale/detail.entity.js';
import { Authority } from '../../../src/modules/authority/authority.entity.js';
import { Bribe } from '../../../src/modules/bribe/bribe.entity.js';
import { User, Role } from '../../../src/modules/auth/user/user.entity.js';
import { BasePersonEntity } from '../../../src/shared/base.person.entity.js';

// ============================================================================
// PATRÓN #3: Logger con __esModule: true
// ============================================================================
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

// ============================================================================
// PATRÓN #1: NO mockear ResponseUtil (usar implementación real)
// ============================================================================
// (No mock here - using real implementation)

// ============================================================================
// MOCK DEPENDENCIES
// ============================================================================
jest.mock('../../../src/shared/db/orm.js', () => ({
  orm: {
    em: {
      fork: jest.fn()
    }
  }
}));
jest.mock('../../../src/shared/utils/search.util.js', () => ({
  searchEntityWithPaginationCached: jest.fn()
}));
jest.mock('../../../src/shared/middleware/validation.middleware.js');

// ============================================================================
// TEST SUITE
// ============================================================================
describe('SaleController', () => {
  let controller: SaleController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockEntityManager: any;

  beforeEach(() => {
    controller = new SaleController();

    // ────────────────────────────────────────────────────────────────────────
    // PATRÓN #2: Mock Response con .set() para error-formatter.util.ts
    // ────────────────────────────────────────────────────────────────────────
    mockResponse = {
      status: jest.fn() as any,
      json: jest.fn() as any,
      set: jest.fn() as any,
      send: jest.fn() as any,
      locals: {
        validated: {
          body: {},
          params: {}
        }
      }
    };

    // Configurar chaining para métodos
    (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
    (mockResponse.json as jest.Mock).mockReturnValue(mockResponse);
    (mockResponse.set as jest.Mock).mockReturnValue(mockResponse);
    (mockResponse.send as jest.Mock).mockReturnValue(mockResponse);

    mockRequest = {
      params: {},
      query: {},
      body: {}
    } as any;

    // ────────────────────────────────────────────────────────────────────────
    // Mock EntityManager
    // ────────────────────────────────────────────────────────────────────────
    mockEntityManager = {
      findOne: jest.fn() as any,
      find: jest.fn() as any,
      count: jest.fn() as any,
      create: jest.fn() as any,
      persist: jest.fn() as any,
      persistAndFlush: jest.fn() as any,
      removeAndFlush: jest.fn() as any,
      flush: jest.fn() as any,
      getReference: jest.fn() as any,
      getKnex: jest.fn() as any,
      fork: jest.fn(() => mockEntityManager) as any
    };

    (orm.em.fork as jest.Mock) = jest.fn(() => mockEntityManager);

    // Reset all mocks
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. searchSales() - SEARCH & FILTER METHODS
  // ══════════════════════════════════════════════════════════════════════════

  describe('searchSales', () => {
    it('should search sales successfully for ADMIN user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'admin',
        email: 'admin@test.com',
        roles: [Role.ADMIN]
      };

      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.query = { q: 'test', by: 'client', page: '1', limit: '10' };

      (validateQueryParams as jest.Mock).mockReturnValue({
        q: 'test',
        by: 'client',
        page: 1,
        limit: 10
      });

      mockEntityManager.findOne.mockResolvedValue(mockUser);
      (searchEntityWithPaginationCached as jest.Mock).mockImplementation(() => Promise.resolve(mockResponse));

      await controller.searchSales(mockRequest as Request, mockResponse as Response);

      expect(validateQueryParams).toHaveBeenCalled();
      expect(searchEntityWithPaginationCached).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        Sale,
        expect.objectContaining({
          entityName: 'sale',
          searchFields: 'client.name'
        })
      );
    });

    it('should filter sales by authority for PARTNER user', async () => {
      const mockUser = {
        id: 'user-2',
        username: 'partner',
        email: 'partner@test.com',
        roles: [Role.PARTNER]
      };

      const mockAuthority = {
        id: '1',
        dni: '12345678',
        name: 'Partner Auth',
        email: 'partner@test.com',
        rank: 1
      };

      (mockRequest as any).user = { id: 'user-2' };
      mockRequest.query = { q: 'test', by: 'client' };

      (validateQueryParams as jest.Mock).mockReturnValue({ q: 'test', by: 'client' });
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthority);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        const filters = options.buildFilters();
        expect(filters.authority).toBe('1');
        return Promise.resolve(mockResponse);
      });

      await controller.searchSales(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Authority, { email: 'partner@test.com' });
    });

    it('should filter sales by distributor for DISTRIBUTOR user', async () => {
      const mockUser = {
        id: 'user-3',
        username: 'distributor',
        email: 'dist@test.com',
        roles: [Role.DISTRIBUTOR]
      };

      const mockDistributor = {
        dni: '87654321',
        name: 'Distributor Name',
        email: 'dist@test.com'
      };

      (mockRequest as any).user = { id: 'user-3' };
      mockRequest.query = { q: 'test', by: 'distributor' };

      (validateQueryParams as jest.Mock).mockReturnValue({ q: 'test', by: 'distributor' });
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockDistributor);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        const filters = options.buildFilters();
        expect((filters as any).distributor).toEqual({ dni: '87654321' });
        return Promise.resolve(mockResponse);
      });

      await controller.searchSales(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Distributor, { email: 'dist@test.com' });
    });

    it('should search by distributor field when by=distributor', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.query = { q: 'test', by: 'distributor' };

      (validateQueryParams as jest.Mock).mockReturnValue({ q: 'test', by: 'distributor' });
      mockEntityManager.findOne.mockResolvedValue(null);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        expect(options.searchFields).toBe('distributor.name');
        return Promise.resolve(mockResponse);
      });

      await controller.searchSales(mockRequest as Request, mockResponse as Response);
    });

    it('should search by zone field when by=zone', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.query = { q: 'test', by: 'zone' };

      (validateQueryParams as jest.Mock).mockReturnValue({ q: 'test', by: 'zone' });
      mockEntityManager.findOne.mockResolvedValue(null);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        expect(options.searchFields).toBe('distributor.zone.name');
        return Promise.resolve(mockResponse);
      });

      await controller.searchSales(mockRequest as Request, mockResponse as Response);
    });

    it('should filter by exact date when type=exact', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.query = { date: '2025-01-01', type: 'exact' };

      (validateQueryParams as jest.Mock).mockReturnValue({ date: '2025-01-01', type: 'exact' });
      mockEntityManager.findOne.mockResolvedValue(null);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        const filters = options.buildFilters();
        expect(filters.saleDate).toBeDefined();
        expect(filters.saleDate.$gte).toBeInstanceOf(Date);
        expect(filters.saleDate.$lte).toBeInstanceOf(Date);
        return Promise.resolve(mockResponse);
      });

      await controller.searchSales(mockRequest as Request, mockResponse as Response);
    });

    it('should filter by before date when type=before', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.query = { date: '2025-01-01', type: 'before' };

      (validateQueryParams as jest.Mock).mockReturnValue({ date: '2025-01-01', type: 'before' });
      mockEntityManager.findOne.mockResolvedValue(null);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        const filters = options.buildFilters();
        expect(filters.saleDate.$lte).toBeInstanceOf(Date);
        return Promise.resolve(mockResponse);
      });

      await controller.searchSales(mockRequest as Request, mockResponse as Response);
    });

    it('should filter by after date when type=after', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.query = { date: '2025-01-01', type: 'after' };

      (validateQueryParams as jest.Mock).mockReturnValue({ date: '2025-01-01', type: 'after' });
      mockEntityManager.findOne.mockResolvedValue(null);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        const filters = options.buildFilters();
        expect(filters.saleDate.$gte).toBeInstanceOf(Date);
        return Promise.resolve(mockResponse);
      });

      await controller.searchSales(mockRequest as Request, mockResponse as Response);
    });

    it('should filter by date range when type=between', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.query = { date: '2025-01-01', type: 'between', endDate: '2025-01-31' };

      (validateQueryParams as jest.Mock).mockReturnValue({
        date: '2025-01-01',
        type: 'between',
        endDate: '2025-01-31'
      });
      mockEntityManager.findOne.mockResolvedValue(null);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        const filters = options.buildFilters();
        expect(filters.saleDate.$gte).toBeInstanceOf(Date);
        expect(filters.saleDate.$lte).toBeInstanceOf(Date);
        return Promise.resolve(mockResponse);
      });

      await controller.searchSales(mockRequest as Request, mockResponse as Response);
    });

    it('should return early if validation fails', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue(null);

      await controller.searchSales(mockRequest as Request, mockResponse as Response);

      expect(searchEntityWithPaginationCached).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. getSalesSummary() - SUMMARY & CHART METHODS
  // ══════════════════════════════════════════════════════════════════════════

  describe('getSalesSummary', () => {
    it('should retrieve sales summary successfully', async () => {
      const salesData = [
        { date: '2025-01-01', total: '1500.50' },
        { date: '2025-01-02', total: '2300.75' }
      ];

      const mockOrderBy = jest.fn() as any;
      mockOrderBy.mockResolvedValue(salesData);

      const mockKnex: any = {
        select: jest.fn().mockReturnThis(),
        sum: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: mockOrderBy,
        raw: jest.fn((sql: string) => sql)
      };

      mockEntityManager.getKnex.mockReturnValue(mockKnex);

      await controller.getSalesSummary(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.getKnex).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Sales summary retrieved successfully',
          data: expect.objectContaining({
            labels: expect.any(Array),
            data: expect.arrayContaining([1500.50, 2300.75])
          })
        })
      );
    });

    it('should return 500 on database error', async () => {
      mockEntityManager.getKnex.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await controller.getSalesSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INTERNAL_SERVER_ERROR'
        })
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. createSale() - CREATE (Complex tests)
  // ══════════════════════════════════════════════════════════════════════════

  describe('createSale', () => {
    beforeEach(() => {
      mockResponse.locals = {
        validated: {
          body: {
            clientDni: '12345678',
            distributorDni: '87654321',
            details: [{ productId: 1, quantity: 2 }]
          },
          params: {}
        }
      };
    });

    it('should return 404 if user does not exist', async () => {
      (mockRequest as any).user = { id: 'non-existent' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('User')
        })
      );
    });

    it('should return 400 if business rules validation fails', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        canPurchase: jest.fn().mockReturnValue(true)
      };

      (mockRequest as any).user = { id: 'user-1' };
      mockEntityManager.findOne.mockResolvedValue(mockUser);

      (validateBusinessRules as jest.Mock).mockReturnValue([
        { field: 'details', message: 'At least one detail required' }
      ]);

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Business rule validation failed'
        })
      );
    });

    it('should create sale successfully with existing client', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        roles: [],
        canPurchase: jest.fn().mockReturnValue(true),
        person: { dni: '12345678', name: 'Test User' }
      };

      const mockClient = { dni: '12345678', name: 'Test Client', email: 'client@test.com' };
      const mockDistributor = { dni: '87654321', name: 'Test Distributor', email: 'dist@test.com' };
      const mockProduct = { id: 1, name: 'Product 1', price: 100, isIllegal: false };
      const mockSale = { id: 1, saleAmount: 200, toDTO: jest.fn().mockReturnValue({ id: 1, saleAmount: 200 }) };

      (mockRequest as any).user = { id: 'user-1' };
      (validateBusinessRules as jest.Mock).mockReturnValue([]);

      // ────────────────────────────────────────────────────────────────────────
      // PATRÓN #5: Sequential findOne mocks
      // ────────────────────────────────────────────────────────────────────────
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser) // findOne User
        .mockResolvedValueOnce(mockClient) // findOne Client
        .mockResolvedValueOnce(mockDistributor) // findOne Distributor
        .mockResolvedValueOnce(mockProduct) // findOne Product
        .mockResolvedValueOnce(mockSale); // findOne Sale (for response)

      mockEntityManager.create.mockImplementation((entity: any, data: any) => {
        if (entity === Sale) {
          return { ...data, details: { add: jest.fn(), getItems: () => [] } };
        }
        return data;
      });

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sale registered successfully',
          data: expect.objectContaining({ id: 1 })
        })
      );
    });

    it('should return 404 if distributor not found', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        canPurchase: jest.fn().mockReturnValue(true),
        person: { dni: '12345678' }
      };

      (mockRequest as any).user = { id: 'user-1' };
      (validateBusinessRules as jest.Mock).mockReturnValue([]);

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser) // User
        .mockResolvedValueOnce(null) // Client
        .mockResolvedValueOnce(null); // Distributor (not found)

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Distributor')
        })
      );
    });

    it('should create new client and BasePersonEntity if not exists', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        roles: [],
        canPurchase: jest.fn().mockReturnValue(true),
        person: null
      };

      mockResponse.locals!.validated.body = {
        clientDni: '12345678',
        distributorDni: '87654321',
        details: [{ productId: 1, quantity: 2 }],
        person: {
          name: 'New Client',
          email: 'new@test.com',
          phone: '123456',
          address: 'Address'
        }
      };

      const mockDistributor = { dni: '87654321', name: 'Test Distributor', email: 'dist@test.com' };
      const mockProduct = { id: 1, name: 'Product 1', price: 100, isIllegal: false };
      const mockBasePerson = { dni: '12345678', name: 'New Client', email: 'new@test.com' };
      const mockClient = { dni: '12345678', name: 'New Client', email: 'new@test.com' };
      const mockSale = { id: 1, toDTO: jest.fn().mockReturnValue({ id: 1 }) };

      (mockRequest as any).user = { id: 'user-1' };
      (validateBusinessRules as jest.Mock).mockReturnValue([]);

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser) // User
        .mockResolvedValueOnce(null) // Client (not found)
        .mockResolvedValueOnce(mockDistributor) // Distributor
        .mockResolvedValueOnce(null) // BasePersonEntity (not found)
        .mockResolvedValueOnce(mockProduct) // Product
        .mockResolvedValueOnce(mockSale); // Sale (for response)

      mockEntityManager.create.mockImplementation((entity: any, data: any) => {
        if (entity === BasePersonEntity) return mockBasePerson;
        if (entity === Client) return mockClient;
        if (entity === Sale) {
          return { ...data, details: { add: jest.fn(), getItems: () => [{ subtotal: 200 }] } };
        }
        if (entity === Detail) return { subtotal: 200 };
        return data;
      });

      // ────────────────────────────────────────────────────────────────────────
      // PATRÓN #4: persistAndFlush con dynamic ID assignment
      // ────────────────────────────────────────────────────────────────────────
      mockEntityManager.persistAndFlush.mockImplementation((entity: any) => {
        if (entity && !entity.id && entity.username) {
          entity.id = 'user-1';
        }
        return Promise.resolve();
      });

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.create).toHaveBeenCalledWith(BasePersonEntity, expect.any(Object));
      expect(mockEntityManager.create).toHaveBeenCalledWith(Client, expect.any(Object));
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if clientDni is missing when user has no person', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        canPurchase: jest.fn().mockReturnValue(true),
        person: null
      };

      mockResponse.locals!.validated.body = {
        distributorDni: '87654321',
        details: [{ productId: 1, quantity: 2 }]
      };

      (mockRequest as any).user = { id: 'user-1' };
      (validateBusinessRules as jest.Mock).mockReturnValue([]);

      mockEntityManager.findOne.mockResolvedValueOnce(mockUser);

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Client DNI is required'
        })
      );
    });

    it('should return 400 if product not found', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        canPurchase: jest.fn().mockReturnValue(true),
        person: { dni: '12345678' }
      };

      const mockClient = { dni: '12345678', name: 'Test Client', email: 'client@test.com' };
      const mockDistributor = { dni: '87654321', name: 'Test Distributor', email: 'dist@test.com' };

      (mockRequest as any).user = { id: 'user-1' };
      (validateBusinessRules as jest.Mock).mockReturnValue([]);

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(mockDistributor)
        .mockResolvedValueOnce(null); // Product not found

      mockEntityManager.create.mockImplementation((entity: any, data: any) => {
        if (entity === Sale) {
          return { ...data, details: { add: jest.fn(), getItems: () => [] } };
        }
        return data;
      });

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Product with ID')
        })
      );
    });

    it('should create bribe when sale includes illegal products', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        roles: [],
        canPurchase: jest.fn().mockReturnValue(true),
        person: { dni: '12345678' }
      };

      const mockClient = { dni: '12345678', name: 'Test Client', email: 'client@test.com' };
      const mockZone = { id: 1, name: 'Zone 1' };
      const mockDistributor = { dni: '87654321', name: 'Test Distributor', email: 'dist@test.com', zone: mockZone };
      const mockIllegalProduct = { id: 1, name: 'Illegal Product', price: 500, isIllegal: true };
      const mockAuthority = { id: '1', dni: '99999999', name: 'Authority Name', email: 'auth@test.com', rank: 1 };
      const mockSale = { id: 1, toDTO: jest.fn().mockReturnValue({ id: 1 }) };

      (mockRequest as any).user = { id: 'user-1' };
      (validateBusinessRules as jest.Mock).mockReturnValue([]);

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser) // User
        .mockResolvedValueOnce(mockClient) // Client
        .mockResolvedValueOnce(mockDistributor) // Distributor
        .mockResolvedValueOnce(mockIllegalProduct) // Product (illegal)
        .mockResolvedValueOnce(mockSale); // Sale (for response)

      mockEntityManager.find.mockResolvedValue([mockAuthority]);
      mockEntityManager.count.mockResolvedValue(0);

      mockEntityManager.create.mockImplementation((entity: any, data: any) => {
        if (entity === Sale) {
          return {
            ...data,
            details: {
              add: jest.fn(),
              getItems: () => [{ subtotal: 1000 }]
            }
          };
        }
        if (entity === Detail) return { subtotal: 1000 };
        if (entity === Bribe) return { authority: mockAuthority, totalAmount: 100 };
        return data;
      });

      mockEntityManager.getReference.mockReturnValue(mockAuthority);

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.find).toHaveBeenCalledWith(Authority, { zone: 1 });
      expect(mockEntityManager.create).toHaveBeenCalledWith(Bribe, expect.any(Object));
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should assign CLIENT role to user after first purchase', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        roles: [],
        canPurchase: jest.fn().mockReturnValue(true),
        person: { dni: '12345678' }
      };

      const mockClient = { dni: '12345678', name: 'Test Client', email: 'client@test.com' };
      const mockDistributor = { dni: '87654321', name: 'Test Distributor', email: 'dist@test.com' };
      const mockProduct = { id: 1, name: 'Product 1', price: 100, isIllegal: false };
      const mockSale = { id: 1, toDTO: jest.fn().mockReturnValue({ id: 1 }) };

      (mockRequest as any).user = { id: 'user-1' };
      (validateBusinessRules as jest.Mock).mockReturnValue([]);

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(mockDistributor)
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockSale);

      mockEntityManager.create.mockImplementation((entity: any, data: any) => {
        if (entity === Sale) {
          return { ...data, details: { add: jest.fn(), getItems: () => [{ subtotal: 200 }] } };
        }
        if (entity === Detail) return { subtotal: 200 };
        return data;
      });

      await controller.createSale(mockRequest as Request, mockResponse as Response);

      expect(mockUser.roles).toContain(Role.CLIENT);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
    });

  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. getMyPurchases() - GET MY PURCHASES (CLIENT)
  // ══════════════════════════════════════════════════════════════════════════

  describe('getMyPurchases', () => {
    it('should return 404 if user does not exist', async () => {
      (mockRequest as any).user = { id: 'non-existent' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await controller.getMyPurchases(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'NOT_FOUND'
        })
      );
    });

    it('should retrieve purchases successfully by DNI', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        person: { dni: '12345678', isInitialized: () => true }
      };

      const mockSale1 = { id: 1, saleAmount: 100, toDTO: jest.fn().mockReturnValue({ id: 1 }) };
      const mockSale2 = { id: 2, saleAmount: 200, toDTO: jest.fn().mockReturnValue({ id: 2 }) };

      (mockRequest as any).user = { id: 'user-1' };

      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.find.mockResolvedValue([mockSale1, mockSale2]);

      await controller.getMyPurchases(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        Sale,
        { client: { dni: '12345678' } },
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '2 purchase(s) retrieved successfully'
        })
      );
    });

    it('should fallback to email search if user has no DNI', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        person: null
      };

      const mockSale = {
        id: 1,
        client: { dni: '12345678' },
        toDTO: jest.fn().mockReturnValue({ id: 1 })
      };

      (mockRequest as any).user = { id: 'user-1' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser) // User
        .mockResolvedValueOnce({ dni: '12345678' }); // BasePersonEntity

      mockEntityManager.find.mockResolvedValue([mockSale]);

      await controller.getMyPurchases(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        Sale,
        { client: { email: 'test@test.com' } },
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if user has no DNI and no sales found by email', async () => {
      const mockUser: any = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        person: null
      };

      (mockRequest as any).user = { id: 'user-1' };

      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.find.mockResolvedValue([]);

      await controller.getMyPurchases(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('User profile is incomplete')
        })
      );
    });

    it('should return success with empty array if no purchases found', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'test',
        email: 'test@test.com',
        person: { dni: '12345678', isInitialized: () => true }
      };

      (mockRequest as any).user = { id: 'user-1' };

      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.find.mockResolvedValue([]);

      await controller.getMyPurchases(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'No purchases found',
          data: []
        })
      );
    });

    it('should return 500 on unexpected error', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await controller.getMyPurchases(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INTERNAL_SERVER_ERROR'
        })
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. getAllSales() - READ ALL
  // ══════════════════════════════════════════════════════════════════════════

  describe('getAllSales', () => {
    it('should get all sales without filters for ADMIN user', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'admin',
        email: 'admin@test.com',
        roles: [Role.ADMIN]
      };

      (mockRequest as any).user = { id: 'user-1' };
      mockRequest.query = { page: '1', limit: '10' };

      mockEntityManager.findOne.mockResolvedValue(mockUser);
      (searchEntityWithPaginationCached as jest.Mock).mockImplementation(() => Promise.resolve(mockResponse));

      await controller.getAllSales(mockRequest as Request, mockResponse as Response);

      expect(searchEntityWithPaginationCached).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        Sale,
        expect.objectContaining({
          entityName: 'sale',
          buildFilters: expect.any(Function)
        })
      );
    });

    it('should filter sales by authority for PARTNER user', async () => {
      const mockUser = {
        id: 'user-2',
        username: 'partner',
        email: 'partner@test.com',
        roles: [Role.PARTNER]
      };

      const mockAuthority = {
        id: '1',
        dni: '12345678',
        name: 'Partner Auth',
        email: 'partner@test.com',
        rank: 1
      };

      (mockRequest as any).user = { id: 'user-2' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthority);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        const filters = options.buildFilters();
        expect(filters.authority).toBe('1');
        return Promise.resolve(mockResponse);
      });

      await controller.getAllSales(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Authority, { email: 'partner@test.com' });
    });

    it('should filter sales by distributor for DISTRIBUTOR user', async () => {
      const mockUser = {
        id: 'user-3',
        username: 'distributor',
        email: 'dist@test.com',
        roles: [Role.DISTRIBUTOR]
      };

      const mockDistributor = {
        dni: '87654321',
        name: 'Distributor Name',
        email: 'dist@test.com'
      };

      (mockRequest as any).user = { id: 'user-3' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockDistributor);

      (searchEntityWithPaginationCached as jest.Mock).mockImplementation((req: any, res: any, entity: any, options: any) => {
        const filters = options.buildFilters();
        expect((filters as any).distributor).toEqual({ dni: '87654321' });
        return Promise.resolve(mockResponse);
      });

      await controller.getAllSales(mockRequest as Request, mockResponse as Response);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. getOneSaleById() - READ ONE
  // ══════════════════════════════════════════════════════════════════════════

  describe('getOneSaleById', () => {
    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await controller.getOneSaleById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid ID'
        })
      );
    });

    it('should return 404 if sale not found', async () => {
      mockRequest.params = { id: '999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await controller.getOneSaleById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'NOT_FOUND'
        })
      );
    });

    it('should retrieve sale successfully for ADMIN user', async () => {
      const mockSale = {
        id: 1,
        saleAmount: 100,
        toDTO: jest.fn().mockReturnValue({ id: 1, saleAmount: 100 })
      };

      mockRequest.params = { id: '1' };
      (mockRequest as any).user = { id: 'admin-1' };

      const mockUser = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@test.com',
        roles: [Role.ADMIN]
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockSale)
        .mockResolvedValueOnce(mockUser);

      await controller.getOneSaleById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Sale found successfully',
          data: expect.objectContaining({ id: 1 })
        })
      );
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest.params = { id: '1' };
      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await controller.getOneSaleById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INTERNAL_SERVER_ERROR'
        })
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. updateSale() - UPDATE
  // ══════════════════════════════════════════════════════════════════════════

  describe('updateSale', () => {
    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await controller.updateSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid ID'
        })
      );
    });

    it('should return 404 if sale not found', async () => {
      mockRequest.params = { id: '999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await controller.updateSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'NOT_FOUND'
        })
      );
    });

    it('should return 400 if no fields to update', async () => {
      const mockSale = { id: 1, saleAmount: 100 };

      mockRequest.params = { id: '1' };
      mockRequest.body = {};

      mockEntityManager.findOne.mockResolvedValue(mockSale);

      await controller.updateSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation error'
        })
      );
    });

    it('should update distributor successfully', async () => {
      const mockSale: any = {
        id: 1,
        distributor: { dni: '11111111', name: 'Old Distributor' },
        toDTO: jest.fn().mockReturnValue({ id: 1 })
      };

      const mockNewDistributor = { dni: '22222222', name: 'New Distributor', email: 'new@test.com' };

      mockRequest.params = { id: '1' };
      mockRequest.body = { distributorDni: '22222222' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockSale)
        .mockResolvedValueOnce(mockNewDistributor);

      await controller.updateSale(mockRequest as Request, mockResponse as Response);

      expect(mockSale.distributor).toBe(mockNewDistributor);
      expect(mockEntityManager.flush).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('New Distributor')
        })
      );
    });

    it('should update authority successfully', async () => {
      const mockSale: any = {
        id: 1,
        authority: { dni: '11111111', name: 'Old Authority' },
        toDTO: jest.fn().mockReturnValue({ id: 1 })
      };

      const mockNewAuthority = { id: '2', dni: '22222222', name: 'New Authority', email: 'new@test.com', rank: 1 };

      mockRequest.params = { id: '1' };
      mockRequest.body = { authorityDni: '22222222' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockSale)
        .mockResolvedValueOnce(mockNewAuthority);

      await controller.updateSale(mockRequest as Request, mockResponse as Response);

      expect(mockSale.authority).toBe(mockNewAuthority);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should remove authority when authorityDni is null', async () => {
      const mockSale: any = {
        id: 1,
        authority: { dni: '11111111' },
        toDTO: jest.fn().mockReturnValue({ id: 1 })
      };

      mockRequest.params = { id: '1' };
      mockRequest.body = { authorityDni: null };

      mockEntityManager.findOne.mockResolvedValue(mockSale);

      await controller.updateSale(mockRequest as Request, mockResponse as Response);

      expect(mockSale.authority).toBeUndefined();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('authority removed')
        })
      );
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { distributorDni: '12345678' };
      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await controller.updateSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INTERNAL_SERVER_ERROR'
        })
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 8. deleteSale() - DELETE
  // ══════════════════════════════════════════════════════════════════════════

  describe('deleteSale', () => {
    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await controller.deleteSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid ID'
        })
      );
    });

    it('should return 404 if sale not found', async () => {
      mockRequest.params = { id: '999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await controller.deleteSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'NOT_FOUND'
        })
      );
    });

    it('should return 400 if sale has associated bribes', async () => {
      const mockSale = { id: 1, saleAmount: 100 };

      mockRequest.params = { id: '1' };

      mockEntityManager.findOne.mockResolvedValue(mockSale);
      mockEntityManager.count.mockResolvedValue(2);

      await controller.deleteSale(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.count).toHaveBeenCalledWith(Bribe, { sale: 1 });
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('2 bribe(s) associated')
        })
      );
    });

    it('should delete sale successfully when no bribes exist', async () => {
      const mockSale = { id: 1, saleAmount: 100 };

      mockRequest.params = { id: '1' };

      mockEntityManager.findOne.mockResolvedValue(mockSale);
      mockEntityManager.count.mockResolvedValue(0);

      await controller.deleteSale(mockRequest as Request, mockResponse as Response);

      expect(mockEntityManager.removeAndFlush).toHaveBeenCalledWith(mockSale);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Sale deleted successfully'
        })
      );
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest.params = { id: '1' };
      mockEntityManager.findOne.mockRejectedValue(new Error('Database error'));

      await controller.deleteSale(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INTERNAL_SERVER_ERROR'
        })
      );
    });
  });
});
