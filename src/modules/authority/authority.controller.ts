// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Authority } from './authority.entity.js';
import { Zone } from '../zone/zone.entity.js';
import { Role, User } from '../auth/user/user.entity.js';
import { Bribe } from '../../modules/bribe/bribe.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { searchAuthoritiesSchema, authorityBribesQuerySchema } from './authority.schema.js';
import { AuthorityFilters, BribeFilters } from '../../shared/types/common.types.js';
// ============================================================================
// CONTROLLER - Authority
// ============================================================================

/**
 * Controller for handling authority-related operations.
 * @class AuthorityController
 */
export class AuthorityController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search for authorities based on various criteria.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by name
   * - zone: string - Filter by zone name
   * - rank: number - Filter by rank
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  async searchAuthorities(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchAuthoritiesSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPagination(req, res, Authority, {
      entityName: 'authority',
      em,
      searchFields: 'name',
      buildFilters: () => {
        const { zone, rank } = validated;
        const filters: AuthorityFilters = {};

        if (zone) {
          filters.zone = { name: { $like: `%${zone}%` } } as any;
        }

        if (rank !== undefined) {
          filters.rank = rank;
        }

        return filters;
      },
      populate: ['zone', 'bribes'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  /**
   * Retrieves bribes for a specific authority.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   * - paid: 'true' | 'false' - Filter by payment status
   * - minAmount: number - Minimum bribe amount
   * - maxAmount: number - Maximum bribe amount
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAuthorityBribes(req: Request, res: Response) {
    const em = orm.em.fork();
    const user = (req as any).user;
    const authorityDniFromParam = req.params.dni;

    // Validate query params
    const validated = validateQueryParams(req, res, authorityBribesQuerySchema);
    if (!validated) return; // Validation failed, response already sent

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Authorization check
      // ──────────────────────────────────────────────────────────────────────
      const isAuthority = user.roles.includes(Role.AUTHORITY);
      const isAdmin = user.roles.includes(Role.ADMIN);

      if (!isAuthority && !isAdmin) {
        return ResponseUtil.forbidden(
          res,
          'You are not allowed to perform this action'
        );
      }

      // Authorities can only see their own bribes
      if (isAuthority && user.dni !== authorityDniFromParam) {
        return ResponseUtil.forbidden(
          res,
          'You are not allowed to view bribes for another authority'
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Verify authority exists
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(Authority, { dni: authorityDniFromParam });
      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', authorityDniFromParam);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Use searchEntityWithPagination with filter builder
      // ──────────────────────────────────────────────────────────────────────
      return searchEntityWithPagination(req, res, Bribe, {
        entityName: 'bribe',
        em,
        buildFilters: () => {
          const { paid, min, max } = validated;
        const filters: BribeFilters = {
          authority: { dni: authorityDniFromParam },
        };

          // Filter by payment status
          if (paid !== undefined) {
            filters.paid = paid === 'true';
          }

          // Filter by amount range (already validated by Zod)
          if (min !== undefined || max !== undefined) {
            filters.amount = {};
            if (min !== undefined) filters.amount.$gte = min;
            if (max !== undefined) filters.amount.$lte = max;
          }

          return filters;
        },
        populate: ['authority', 'sale'] as any,
        orderBy: { creationDate: 'DESC' } as any,
      });
    } catch (err: any) {
      logger.error({ err }, 'Error getting bribes');
      return ResponseUtil.internalError(res, 'Error getting bribes', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new authority.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createAuthority(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Extract and validate data
      // ──────────────────────────────────────────────────────────────────────
      logger.info({ data: res.locals.validated?.body }, '🔍 Data received');
      const { dni, name, email, address, phone, rank, zoneId } =
        res.locals.validated.body;

      // ──────────────────────────────────────────────────────────────────────
      // Verify existing DNI in Authority
      // ──────────────────────────────────────────────────────────────────────
      const existingDNI = await em.findOne(Authority, { dni });
      if (existingDNI) {
        return ResponseUtil.conflict(
          res,
          'An authority with that DNI already exists',
          'dni'
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Verify zone existence
      // ──────────────────────────────────────────────────────────────────────
      const existingZone = await em.count(Zone, { id: zoneId });
      if (!existingZone) {
        return ResponseUtil.notFound(res, 'Zone', zoneId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Find or create base person by DNI
      // ──────────────────────────────────────────────────────────────────────
      let basePerson = await em.findOne(BasePersonEntity, { dni });
      if (!basePerson) {
        logger.info('🏛️ Creating base person...');
        basePerson = em.create(BasePersonEntity, {
          dni,
          name,
          email,
          phone: phone ?? '-',
          address: address ?? '-',
        });
        await em.persistAndFlush(basePerson);
        logger.info('✅ Base person created');
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create Authority
      // ──────────────────────────────────────────────────────────────────────
      const authority = em.create(Authority, {
        dni,
        name,
        email,
        address: address ?? '-',
        phone: phone ?? '-',
        rank,
        zone: em.getReference(Zone, zoneId),
      });
      await em.persistAndFlush(authority);
      logger.info('✅ Authority created');

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const authorityData = authority.toDTO?.() ?? {
        id: authority.id,
        dni: authority.dni,
        name: authority.name,
        email: authority.email,
      };

      return ResponseUtil.created(
        res,
        'Authority created successfully',
        authorityData
      );
    } catch (error: any) {
      logger.error({ err: error }, '💥 Full error');
      return ResponseUtil.internalError(res, 'Error creating authority', error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all authorities with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllAuthorities(req: Request, res: Response) {
    const em = orm.em.fork();

    // Use searchEntityWithPagination with empty filters
    return searchEntityWithPagination(req, res, Authority, {
      entityName: 'authority',
      em,
      buildFilters: () => ({}), // No filters, return all
      populate: ['zone', 'bribes'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single authority by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneAuthorityByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch authority by DNI
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'bribes'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Authority found successfully',
        authority.toDTO()
      );
    } catch (error) {
      logger.error({ err: error }, 'Error getting authority');
      return ResponseUtil.internalError(
        res,
        'Error searching for authority',
        error
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates an existing authority using PUT method.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async putUpdateAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch authority by DNI
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'user'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Extract and validate data
      // ──────────────────────────────────────────────────────────────────────
      const { name, rank, zoneId } = res.locals.validated.body;

      if (!name || rank === undefined || zoneId === undefined) {
        return ResponseUtil.validationError(
          res,
          'Missing mandatory data to update',
          [
            { field: 'name', message: 'Name is required' },
            { field: 'rank', message: 'Rank is required' },
            { field: 'zoneId', message: 'Zone ID is required' },
          ]
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Verify zone existence
      // ──────────────────────────────────────────────────────────────────────
      const existingZone = await em.count(Zone, { id: zoneId });
      if (!existingZone) {
        return ResponseUtil.notFound(res, 'Zone', zoneId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Update authority properties
      // ──────────────────────────────────────────────────────────────────────
      authority.name = name;
      authority.rank = rank;
      authority.zone = em.getReference(Zone, zoneId);

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        'Authority updated successfully',
        authority.toDTO()
      );
    } catch (error) {
      logger.error({ err: error }, 'Error updating authority');
      return ResponseUtil.internalError(res, 'Error updating authority', error);
    }
  }

  /**
   * Partially updates an existing authority using PATCH method.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async patchUpdateAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch authority by DNI
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'user'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply partial updates
      // ──────────────────────────────────────────────────────────────────────
      const updates = res.locals.validated.body;

      if (updates.zoneId !== undefined) {
        const zone = await em.findOne(Zone, { id: updates.zoneId });
        if (!zone) {
          return ResponseUtil.notFound(res, 'Zone', updates.zoneId);
        }
        authority.zone = zone;
        delete updates.zoneId;
      }

      if (updates.name !== undefined) authority.name = updates.name;
      if (updates.rank !== undefined) authority.rank = updates.rank;

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        'Authority partially modified successfully',
        authority.toDTO()
      );
    } catch (error) {
      logger.error({ err: error }, 'Error in patchUpdate authority');
      return ResponseUtil.internalError(res, 'Error updating authority', error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes an authority by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch authority by DNI
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['bribes'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Check for associated bribes before deletion
      // ──────────────────────────────────────────────────────────────────────
      if (authority.bribes.count() > 0) {
        return ResponseUtil.error(
          res,
          'The authority cannot be deleted because it has associated pending bribes',
          400
        );
      }

      const name = authority.name;

      // ──────────────────────────────────────────────────────────────────────
      // Delete the authority
      // ──────────────────────────────────────────────────────────────────────
      await em.removeAndFlush(authority);
      return ResponseUtil.deleted(
        res,
        `${name}, DNI ${dni} successfully removed from the list of authorities`
      );
    } catch (error) {
      logger.error({ err: error }, 'Error deleting authority');
      return ResponseUtil.internalError(res, 'Error deleting authority', error);
    }
  }
}
