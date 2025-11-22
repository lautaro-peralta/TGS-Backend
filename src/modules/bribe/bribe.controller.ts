// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Authority } from '../authority/authority.entity.js';
import { Bribe } from './bribe.entity.js';
import { Sale } from '../sale/sale.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { searchBribesSchema } from './bribe.schema.js';
import { BribeFilters } from '../../shared/types/common.types.js';
import { User, Role } from '../auth/user/user.entity.js';

// ============================================================================
// CONTROLLER - Bribe
// ============================================================================

/**
 * Controller for handling bribe-related operations.
 * @class BribeController
 */
export class BribeController {

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search bribes with multiple criteria.
   *
   * Query params:
   * - paid: 'true' | 'false' - Filter by payment status
   * - date: ISO 8601 date - Filter by creation date
   * - type: 'exact' | 'before' | 'after' | 'between' - Date search type (required if date is provided)
   * - endDate: ISO 8601 date - End date (only for type='between')
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchBribes(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchBribesSchema);
    if (!validated) return; // Validation failed, response already sent

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Get authenticated user and check if PARTNER or AUTHORITY role
      // ──────────────────────────────────────────────────────────────────────
      const userId = (req as any).user?.id;
      const user = userId ? await em.findOne(User, { id: userId }, { populate: ['person'] }) : null;

      // Get authority if user is PARTNER or AUTHORITY
      let authorityId: string | number | undefined;
      if (user && (user.roles.includes(Role.PARTNER) || user.roles.includes(Role.AUTHORITY))) {
        const authority = await em.findOne(Authority, { email: user.email });
        if (authority) {
          authorityId = authority.id;
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Build filters
      // ──────────────────────────────────────────────────────────────────────
      const { paid, date, type, endDate, page = '1', limit = '10' } = validated;
      const filters: any = {};

      // Filter by authority (for PARTNER/AUTHORITY roles)
      if (authorityId) {
        filters.authority = authorityId;
      }

      // Filter by payment status using raw SQL
      // Since "paid" is a getter (paidAmount >= totalAmount), we compare columns
      if (paid !== undefined) {
        if (paid === 'true') {
          // Paid bribes: paidAmount >= totalAmount
          (filters as any).$and = [
            ...(filters as any).$and || [],
            { $raw: 'paid_amount >= total_amount' }
          ];
        } else {
          // Unpaid bribes: paidAmount < totalAmount
          (filters as any).$and = [
            ...(filters as any).$and || [],
            { $raw: 'paid_amount < total_amount' }
          ];
        }
      }

      // Filter by date
      if (date && type) {
        const parsedDate = new Date(date);
        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);

        switch (type) {
          case 'exact':
            filters.creationDate = { $gte: startOfDay, $lte: endOfDay };
            break;
          case 'before':
            filters.creationDate = { $lte: endOfDay };
            break;
          case 'after':
            filters.creationDate = { $gte: startOfDay };
            break;
          case 'between':
            if (endDate) {
              const parsedEndDate = new Date(endDate);
              const endOfEndDate = new Date(parsedEndDate);
              endOfEndDate.setHours(23, 59, 59, 999);
              filters.creationDate = { $gte: startOfDay, $lte: endOfEndDate };
            }
            break;
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Execute query with pagination
      // ──────────────────────────────────────────────────────────────────────
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const [results, total] = await em.findAndCount(Bribe, filters, {
        populate: ['authority', 'sale'] as any,
        orderBy: { creationDate: 'DESC' } as any,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
      });

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const message = total === 0
        ? 'No bribes found'
        : `Found ${total} bribe${total === 1 ? '' : 's'}`;

      return ResponseUtil.successList(
        res,
        message,
        results.map((b: Bribe) => b.toDTO()),
        {
          page: pageNum,
          limit: limitNum,
          total,
        }
      );
    } catch (err: any) {
      logger.error({ err }, 'Error searching bribes');
      return ResponseUtil.internalError(res, 'Error searching for bribes', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new bribe.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createBribe(req: Request, res: Response) {
    const em = orm.em.fork();
    const { totalAmount, authorityId, saleId } = res.locals.validated.body;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Find related entities
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(Authority, { id: authorityId });
      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', authorityId);
      }

      const sale = await em.findOne(Sale, { id: saleId });
      if (!sale) {
        return ResponseUtil.notFound(res, 'Sale', saleId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create and persist the new bribe
      // ──────────────────────────────────────────────────────────────────────
      const bribe = em.create(Bribe, {
        totalAmount,
        paidAmount: 0,
        authority,
        sale,
        creationDate: new Date(),
      } as any);

      await em.persistAndFlush(bribe);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const createdBribe = await em.findOne(
        Bribe,
        { id: bribe.id },
        {
          populate: ['authority', 'sale'],
        }
      );

      return ResponseUtil.created(
        res,
        'Bribe created successfully',
        createdBribe!.toDTO()
      );
    } catch (err: any) {
      logger.error({ err }, 'Error creating bribe');
      return ResponseUtil.internalError(res, 'Error creating bribe', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all bribes with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllBribes(req: Request, res: Response) {
    const em = orm.em.fork();

    // ──────────────────────────────────────────────────────────────────────
    // Get authenticated user and check if PARTNER or AUTHORITY role
    // ──────────────────────────────────────────────────────────────────────
    const userId = (req as any).user?.id;
    const user = userId ? await em.findOne(User, { id: userId }, { populate: ['person'] }) : null;
    
    const filters: any = {};
    
    // If PARTNER or AUTHORITY, filter only bribes from their authority
    if (user && (user.roles.includes(Role.PARTNER) || user.roles.includes(Role.AUTHORITY))) {
      // Find authority by user email (must match)
      const authority = await em.findOne(Authority, { email: user.email });
      if (authority) {
        filters.authority = authority.id;
      }
    }

    // Use searchEntityWithPagination with filters
    return searchEntityWithPagination(req, res, Bribe, {
      entityName: 'bribe',
      em,
      buildFilters: () => filters,
      populate: ['authority', 'sale'] as any,
      orderBy: { creationDate: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single bribe by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneBribeById(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'Invalid ID', [
        { field: 'id', message: 'The ID must be a valid number' },
      ]);
    }

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch bribe by ID with related data
      // ──────────────────────────────────────────────────────────────────────
      const bribe = await em.findOne(
        Bribe,
        { id },
        {
          populate: ['authority.user', 'sale'],
        }
      );

      if (!bribe) {
        return ResponseUtil.notFound(res, 'Bribe', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Check access if user is PARTNER or AUTHORITY
      // ──────────────────────────────────────────────────────────────────────
      const userId = (req as any).user?.id;
      const user = userId ? await em.findOne(User, { id: userId }, { populate: ['person'] }) : null;
      
      if (user && (user.roles.includes(Role.PARTNER) || user.roles.includes(Role.AUTHORITY))) {
        const authority = await em.findOne(Authority, { email: user.email });
        if (authority) {
          const bribeAuthority = await em.findOne(Authority, { id: (bribe.authority as any).id });
          if (!bribeAuthority || bribeAuthority.id !== authority.id) {
            return ResponseUtil.error(res, 'Access denied: You can only view bribes from your authority', 403);
          }
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Bribe found successfully',
        bribe.toDTO()
      );
    } catch (err: any) {
      logger.error({ err }, 'Error getting bribe');
      return ResponseUtil.internalError(res, 'Error searching for bribe', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Marks a single bribe as paid (using ID from URL params).
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async payBribe(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'Invalid ID', [
        { field: 'id', message: 'The ID must be a valid number' },
      ]);
    }

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Find the bribe
      // ──────────────────────────────────────────────────────────────────────
      const bribe = await em.findOne(Bribe, { id }, { populate: ['authority', 'sale'] });

      if (!bribe) {
        return ResponseUtil.notFound(res, 'Bribe', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Mark bribe as paid
      // ──────────────────────────────────────────────────────────────────────
      bribe.paidAmount = bribe.totalAmount;
      await em.persistAndFlush(bribe);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Bribe paid successfully',
        {
          id: bribe.id,
          paid: bribe.paid,
          totalAmount: bribe.totalAmount,
          paidAmount: bribe.paidAmount,
          pendingAmount: bribe.pendingAmount,
        }
      );
    } catch (err: any) {
      logger.error({ err }, 'Error paying bribe');
      return ResponseUtil.internalError(res, 'Error paying bribe', err);
    }
  }

  /**
   * Marks multiple bribes as paid (using IDs from request body).
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async payBribes(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;
    const { ids } = res.locals.validated.body;

    try {
      let selectedBribes: Bribe[] = [];

      // ──────────────────────────────────────────────────────────────────────
      // Fetch bribes to be paid
      // ──────────────────────────────────────────────────────────────────────
      if (dni) {
        const authority = await em.findOne(
          Authority,
          { dni },
          { populate: ['bribes'] }
        );

        if (!authority) {
          return ResponseUtil.notFound(res, 'Authority', dni);
        }

        selectedBribes = authority.bribes
          .getItems()
          .filter((s) => ids.includes(s.id));

        if (!selectedBribes.length) {
          return ResponseUtil.notFound(
            res,
            'Bribes with those IDs for this authority'
          );
        }
      } else {
        selectedBribes = await em.find(Bribe, {
          id: { $in: ids },
        });

        if (!selectedBribes.length) {
          return ResponseUtil.notFound(res, 'Bribes with those IDs');
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Identify found and not found IDs
      // ──────────────────────────────────────────────────────────────────────
      const foundIds = selectedBribes.map((s) => s.id);
      const notFoundIds = ids.filter((id: number) => !foundIds.includes(id));

      // ──────────────────────────────────────────────────────────────────────
      // Mark bribes as paid and persist changes
      // ──────────────────────────────────────────────────────────────────────
      selectedBribes.forEach((s) => {
        s.paidAmount = s.totalAmount;
      });
      await em.persistAndFlush(selectedBribes);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response with detailed information
      // ──────────────────────────────────────────────────────────────────────
      const paidBribes = selectedBribes.map((s) => ({
        id: s.id,
        paid: s.paid,
        totalAmount: s.totalAmount,
        paidAmount: s.paidAmount,
        pendingAmount: s.pendingAmount,
      }));

      const data: any = {
        paid: paidBribes,
        summary: {
          totalRequested: ids.length,
          successfullyPaid: paidBribes.length,
          notFound: notFoundIds.length,
        },
      };

      if (notFoundIds.length > 0) {
        data.notFoundIds = notFoundIds;
      }

      return ResponseUtil.success(res, 'Bribes payment processed', data);
    } catch (err: any) {
      logger.error({ err }, 'Error paying bribes');
      return ResponseUtil.internalError(res, 'Error paying bribes', err);
    }
  }

  /**
   * Makes a partial payment to a bribe.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async payBribeAmount(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);
    const { amount } = res.locals.validated.body;

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'Invalid ID', [
        { field: 'id', message: 'The ID must be a valid number' },
      ]);
    }

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Find the bribe
      // ──────────────────────────────────────────────────────────────────────
      const bribe = await em.findOne(Bribe, { id }, { populate: ['authority', 'sale'] });

      if (!bribe) {
        return ResponseUtil.notFound(res, 'Bribe', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Validate payment amount
      // ──────────────────────────────────────────────────────────────────────
      if (amount > bribe.pendingAmount) {
        return ResponseUtil.validationError(res, 'Payment amount exceeds pending amount', [
          {
            field: 'amount',
            message: `The payment amount (${amount}) cannot exceed the pending amount (${bribe.pendingAmount})`,
          },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Update paid amount
      // ──────────────────────────────────────────────────────────────────────
      bribe.paidAmount += amount;
      await em.persistAndFlush(bribe);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Payment processed successfully',
        {
          id: bribe.id,
          totalAmount: bribe.totalAmount,
          paidAmount: bribe.paidAmount,
          pendingAmount: bribe.pendingAmount,
          paid: bribe.paid,
          paymentMade: amount,
        }
      );
    } catch (err: any) {
      logger.error({ err }, 'Error processing bribe payment');
      return ResponseUtil.internalError(res, 'Error processing payment', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a bribe by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteBribe(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'Invalid ID', [
        { field: 'id', message: 'The ID must be a valid number' },
      ]);
    }

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Find and delete the bribe
      // ──────────────────────────────────────────────────────────────────────
      const bribe = await em.findOne(Bribe, { id });

      if (!bribe) {
        return ResponseUtil.notFound(res, 'Bribe', id);
      }

      await em.removeAndFlush(bribe);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(res, 'Bribe deleted successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error deleting bribe');
      return ResponseUtil.internalError(res, 'Error deleting bribe', err);
    }
  }
}