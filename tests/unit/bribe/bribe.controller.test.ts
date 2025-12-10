import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { BribeController } from '../../../src/modules/bribe/bribe.controller.js';
import { Bribe } from '../../../src/modules/bribe/bribe.entity.js';
import { Authority } from '../../../src/modules/authority/authority.entity.js';
import { Sale } from '../../../src/modules/sale/sale.entity.js';
import { User, Role } from '../../../src/modules/auth/user/user.entity.js';
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

// Mock search utility
jest.mock('../../../src/shared/utils/search.util.js', () => ({
  searchEntityWithPagination: jest.fn((req: any, res: any) => {
    res.status(200).json({ success: true, data: [] });
    return res;
  })
}));

// Mock validation middleware
jest.mock('../../../src/shared/middleware/validation.middleware.js', () => ({
  validateQueryParams: jest.fn(() => ({ page: '1', limit: '10' }))
}));

import { validateQueryParams } from '../../../src/shared/middleware/validation.middleware.js';
import { searchEntityWithPagination } from '../../../src/shared/utils/search.util.js';
import logger from '../../../src/shared/utils/logger.js';

// ============================================================================
// TEST SUITE
// ============================================================================

describe('BribeController', () => {
  let bribeController: BribeController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockEntityManager: any;

  beforeEach(() => {
    bribeController = new BribeController();

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
      findAndCount: jest.fn(),
      create: jest.fn(),
      persistAndFlush: jest.fn(),
      removeAndFlush: jest.fn(),
      fork: jest.fn().mockReturnThis()
    };

    (orm.em.fork as jest.Mock).mockReturnValue(mockEntityManager);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // searchBribes
  // ──────────────────────────────────────────────────────────────────────────

  describe('searchBribes', () => {
    it('should search bribes successfully without filters', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({ page: '1', limit: '10' });
      (mockRequest as any).user = { id: 'user-1' };

      const mockBribe = {
        id: 1,
        totalAmount: 1000,
        paidAmount: 0,
        toDTO: jest.fn().mockReturnValue({ id: 1, totalAmount: 1000 })
      };

      mockEntityManager.findOne.mockResolvedValue(null); // No user found
      mockEntityManager.findAndCount.mockResolvedValue([[mockBribe], 1]);

      await bribeController.searchBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Found 1 bribe')
        })
      );
    });

    it('should filter by paid status (paid=true)', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({
        page: '1',
        limit: '10',
        paid: 'true'
      });

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.findAndCount.mockResolvedValue([[], 0]);

      await bribeController.searchBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      const filters = mockEntityManager.findAndCount.mock.calls[0][1];
      expect(filters.$and).toBeDefined();
      expect(filters.$and[0].$raw).toBe('paid_amount >= total_amount');
    });

    it('should filter by paid status (paid=false)', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({
        page: '1',
        limit: '10',
        paid: 'false'
      });

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.findAndCount.mockResolvedValue([[], 0]);

      await bribeController.searchBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      const filters = mockEntityManager.findAndCount.mock.calls[0][1];
      expect(filters.$and[0].$raw).toBe('paid_amount < total_amount');
    });

    it('should filter by authority for PARTNER users', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({ page: '1', limit: '10' });
      (mockRequest as any).user = { id: 'user-1' };

      const mockUser = { roles: [Role.PARTNER], email: 'partner@test.com' };
      const mockAuthority = { id: 'auth-1' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser) // User
        .mockResolvedValueOnce(mockAuthority); // Authority

      mockEntityManager.findAndCount.mockResolvedValue([[], 0]);

      await bribeController.searchBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      const filters = mockEntityManager.findAndCount.mock.calls[0][1];
      expect(filters.authority).toBe('auth-1');
    });

    it('should return early if validation fails', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue(null);

      await bribeController.searchBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.findAndCount).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({ page: '1', limit: '10' });
      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await bribeController.searchBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should filter by date (exact)', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({
        page: '1',
        limit: '10',
        date: '2024-01-15',
        type: 'exact'
      });

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.findAndCount.mockResolvedValue([[], 0]);

      await bribeController.searchBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      const filters = mockEntityManager.findAndCount.mock.calls[0][1];
      expect(filters.creationDate).toBeDefined();
      expect(filters.creationDate.$gte).toBeInstanceOf(Date);
      expect(filters.creationDate.$lte).toBeInstanceOf(Date);
    });

    it('should filter by date (between)', async () => {
      (validateQueryParams as jest.Mock).mockReturnValue({
        page: '1',
        limit: '10',
        date: '2024-01-15',
        type: 'between',
        endDate: '2024-01-20'
      });

      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.findAndCount.mockResolvedValue([[], 0]);

      await bribeController.searchBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      const filters = mockEntityManager.findAndCount.mock.calls[0][1];
      expect(filters.creationDate.$gte).toBeInstanceOf(Date);
      expect(filters.creationDate.$lte).toBeInstanceOf(Date);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // createBribe
  // ──────────────────────────────────────────────────────────────────────────

  describe('createBribe', () => {
    it('should create bribe successfully', async () => {
      mockResponse.locals!.validated.body = {
        totalAmount: 1000,
        authorityId: 'auth-1',
        saleId: 'sale-1'
      };

      const mockAuthority = { id: 'auth-1', name: 'Authority 1' };
      const mockSale = { id: 'sale-1' };
      const mockBribe = {
        id: 1,
        totalAmount: 1000,
        toDTO: jest.fn().mockReturnValue({ id: 1, totalAmount: 1000 })
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockAuthority) // Authority
        .mockResolvedValueOnce(mockSale) // Sale
        .mockResolvedValueOnce(mockBribe); // Created bribe

      mockEntityManager.create.mockReturnValue(mockBribe);

      await bribeController.createBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockBribe);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Bribe created successfully'
        })
      );
    });

    it('should return 404 if authority not found', async () => {
      mockResponse.locals!.validated.body = {
        totalAmount: 1000,
        authorityId: 'invalid-auth',
        saleId: 'sale-1'
      };

      mockEntityManager.findOne.mockResolvedValue(null);

      await bribeController.createBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Authority')
        })
      );
    });

    it('should return 404 if sale not found', async () => {
      mockResponse.locals!.validated.body = {
        totalAmount: 1000,
        authorityId: 'auth-1',
        saleId: 'invalid-sale'
      };

      const mockAuthority = { id: 'auth-1' };
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockAuthority) // Authority found
        .mockResolvedValueOnce(null); // Sale not found

      await bribeController.createBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Sale')
        })
      );
    });

    it('should handle database errors', async () => {
      mockResponse.locals!.validated.body = {
        totalAmount: 1000,
        authorityId: 'auth-1',
        saleId: 'sale-1'
      };

      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await bribeController.createBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getAllBribes
  // ──────────────────────────────────────────────────────────────────────────

  describe('getAllBribes', () => {
    it('should call searchEntityWithPagination', async () => {
      (mockRequest as any).user = { id: 'user-1' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await bribeController.getAllBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalledWith(
        mockRequest as any,
        mockResponse as any,
        Bribe,
        expect.objectContaining({
          entityName: 'bribe'
        })
      );
    });

    it('should filter by authority for AUTHORITY role', async () => {
      (mockRequest as any).user = { id: 'user-1' };

      const mockUser = { roles: [Role.AUTHORITY], email: 'auth@test.com' };
      const mockAuthority = { id: 'auth-1' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthority);

      await bribeController.getAllBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(searchEntityWithPagination).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getOneBribeById
  // ──────────────────────────────────────────────────────────────────────────

  describe('getOneBribeById', () => {
    it('should return bribe successfully', async () => {
      mockRequest.params = { id: '1' };
      (mockRequest as any).user = { id: 'user-1' };

      const mockBribe = {
        id: 1,
        authority: { id: 'auth-1' },
        toDTO: jest.fn().mockReturnValue({ id: 1 })
      };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockBribe) // Bribe
        .mockResolvedValueOnce(null); // No user

      await bribeController.getOneBribeById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Bribe found successfully'
        })
      );
    });

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await bribeController.getOneBribeById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid ID'
        })
      );
    });

    it('should return 404 if bribe not found', async () => {
      mockRequest.params = { id: '999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await bribeController.getOneBribeById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for unauthorized PARTNER access', async () => {
      mockRequest.params = { id: '1' };
      (mockRequest as any).user = { id: 'user-1' };

      const mockBribe = {
        id: 1,
        authority: { id: 'auth-1' },
        toDTO: jest.fn()
      };

      const mockUser = { roles: [Role.PARTNER], email: 'partner@test.com' };
      const mockUserAuthority = { id: 'auth-2' }; // Different authority
      const mockBribeAuthority = { id: 'auth-1' };

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockBribe) // Bribe
        .mockResolvedValueOnce(mockUser) // User
        .mockResolvedValueOnce(mockUserAuthority) // User's authority
        .mockResolvedValueOnce(mockBribeAuthority); // Bribe's authority

      await bribeController.getOneBribeById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Access denied')
        })
      );
    });

    it('should handle database errors', async () => {
      mockRequest.params = { id: '1' };
      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await bribeController.getOneBribeById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // payBribe
  // ──────────────────────────────────────────────────────────────────────────

  describe('payBribe', () => {
    it('should pay bribe successfully', async () => {
      mockRequest.params = { id: '1' };

      const mockBribe = {
        id: 1,
        totalAmount: 1000,
        paidAmount: 0,
        paid: false,
        pendingAmount: 1000
      };

      mockEntityManager.findOne.mockResolvedValue(mockBribe);

      await bribeController.payBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockBribe.paidAmount).toBe(1000);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockBribe);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bribe paid successfully'
        })
      );
    });

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await bribeController.payBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if bribe not found', async () => {
      mockRequest.params = { id: '999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await bribeController.payBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      mockRequest.params = { id: '1' };
      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await bribeController.payBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // payBribes
  // ──────────────────────────────────────────────────────────────────────────

  describe('payBribes', () => {
    it('should pay multiple bribes without DNI', async () => {
      mockRequest.params = {};
      mockResponse.locals!.validated.body = { ids: [1, 2, 3] };

      const mockBribes = [
        { id: 1, totalAmount: 1000, paidAmount: 0, paid: false, pendingAmount: 1000 },
        { id: 2, totalAmount: 2000, paidAmount: 0, paid: false, pendingAmount: 2000 }
      ];

      mockEntityManager.find.mockResolvedValue(mockBribes);

      await bribeController.payBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockBribes[0].paidAmount).toBe(1000);
      expect(mockBribes[1].paidAmount).toBe(2000);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bribes payment processed',
          data: expect.objectContaining({
            summary: expect.objectContaining({
              totalRequested: 3,
              successfullyPaid: 2,
              notFound: 1
            })
          })
        })
      );
    });

    it('should pay bribes by authority DNI', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = { ids: [1, 2] };

      const mockBribes = [
        { id: 1, totalAmount: 1000, paidAmount: 0, paid: false, pendingAmount: 1000 },
        { id: 2, totalAmount: 2000, paidAmount: 0, paid: false, pendingAmount: 2000 }
      ];

      const mockAuthority = {
        id: 'auth-1',
        dni: '12345678',
        bribes: {
          getItems: jest.fn().mockReturnValue(mockBribes)
        }
      };

      mockEntityManager.findOne.mockResolvedValue(mockAuthority);

      await bribeController.payBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if authority not found', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = { ids: [1, 2] };

      mockEntityManager.findOne.mockResolvedValue(null);

      await bribeController.payBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Authority')
        })
      );
    });

    it('should return 404 if no bribes found for authority', async () => {
      mockRequest.params = { dni: '12345678' };
      mockResponse.locals!.validated.body = { ids: [999] };

      const mockAuthority = {
        id: 'auth-1',
        bribes: {
          getItems: jest.fn().mockReturnValue([])
        }
      };

      mockEntityManager.findOne.mockResolvedValue(mockAuthority);

      await bribeController.payBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      mockRequest.params = {};
      mockResponse.locals!.validated.body = { ids: [1, 2] };

      mockEntityManager.find.mockRejectedValue(new Error('DB error'));

      await bribeController.payBribes(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // payBribeAmount
  // ──────────────────────────────────────────────────────────────────────────

  describe('payBribeAmount', () => {
    it('should make partial payment successfully', async () => {
      mockRequest.params = { id: '1' };
      mockResponse.locals!.validated.body = { amount: 500 };

      const mockBribe = {
        id: 1,
        totalAmount: 1000,
        paidAmount: 0,
        pendingAmount: 1000,
        paid: false
      };

      mockEntityManager.findOne.mockResolvedValue(mockBribe);

      await bribeController.payBribeAmount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockBribe.paidAmount).toBe(500);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockBribe);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment processed successfully',
          data: expect.objectContaining({
            paymentMade: 500
          })
        })
      );
    });

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };
      mockResponse.locals!.validated.body = { amount: 500 };

      await bribeController.payBribeAmount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if bribe not found', async () => {
      mockRequest.params = { id: '999' };
      mockResponse.locals!.validated.body = { amount: 500 };

      mockEntityManager.findOne.mockResolvedValue(null);

      await bribeController.payBribeAmount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if payment exceeds pending amount', async () => {
      mockRequest.params = { id: '1' };
      mockResponse.locals!.validated.body = { amount: 1500 };

      const mockBribe = {
        id: 1,
        totalAmount: 1000,
        paidAmount: 0,
        pendingAmount: 1000
      };

      mockEntityManager.findOne.mockResolvedValue(mockBribe);

      await bribeController.payBribeAmount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('exceeds pending amount')
        })
      );
    });

    it('should handle database errors', async () => {
      mockRequest.params = { id: '1' };
      mockResponse.locals!.validated.body = { amount: 500 };

      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await bribeController.payBribeAmount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // deleteBribe
  // ──────────────────────────────────────────────────────────────────────────

  describe('deleteBribe', () => {
    it('should delete bribe successfully', async () => {
      mockRequest.params = { id: '1' };

      const mockBribe = { id: 1, totalAmount: 1000 };
      mockEntityManager.findOne.mockResolvedValue(mockBribe);

      await bribeController.deleteBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockEntityManager.removeAndFlush).toHaveBeenCalledWith(mockBribe);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bribe deleted successfully'
        })
      );
    });

    it('should return 400 for invalid ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await bribeController.deleteBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if bribe not found', async () => {
      mockRequest.params = { id: '999' };
      mockEntityManager.findOne.mockResolvedValue(null);

      await bribeController.deleteBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockEntityManager.removeAndFlush).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockRequest.params = { id: '1' };
      mockEntityManager.findOne.mockRejectedValue(new Error('DB error'));

      await bribeController.deleteBribe(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
