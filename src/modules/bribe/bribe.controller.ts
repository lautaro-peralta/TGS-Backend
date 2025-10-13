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

    return searchEntityWithPagination(req, res, Bribe, {
      entityName: 'bribe',
      em,
      buildFilters: () => {
        const { paid, date, type, endDate } = validated;
        const filters: BribeFilters = {};

        // Filter by payment status
        if (paid !== undefined) {
          filters.paid = paid === 'true';
        }

        // Filter by date (already validated by Zod)
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

        return filters;
      },
      populate: ['authority', 'sale'] as any,
      orderBy: { creationDate: 'DESC' } as any,
    });
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
    const { amount, authorityId, saleId } = res.locals.validated.body;

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
        amount,
        authority,
        sale,
        paid: false,
        creationDate: new Date(),
      });

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

    // Use searchEntityWithPagination with empty filters
    return searchEntityWithPagination(req, res, Bribe, {
      entityName: 'bribe',
      em,
      buildFilters: () => ({}), // No filters, return all
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
   * Marks bribes as paid.
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
      selectedBribes.forEach((s) => (s.paid = true));
      await em.persistAndFlush(selectedBribes);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response with detailed information
      // ──────────────────────────────────────────────────────────────────────
      const paidBribes = selectedBribes.map((s) => ({
        id: s.id,
        paid: s.paid,
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