// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Zone } from './zone.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { Authority } from '../authority/authority.entity.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { searchZonesSchema } from './zone.schema.js';
import { ZoneFilters } from '../../shared/types/common.types.js';

// ============================================================================
// CONTROLLER - Zone
// ============================================================================

/**
 * Controller for handling zone-related operations.
 * @class ZoneController
 */
export class ZoneController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search zones by name or by headquarters status.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by name or headquarters status ('true'/'false')
   * - by: 'name' | 'headquarters' (optional, default: 'name') - Search type
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchZones(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchZonesSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPagination(req, res, Zone, {
      entityName: 'zone',
      em,
      searchFields: validated.by === 'headquarters' ? undefined : 'name',
      buildFilters: () => {
        const { by, q } = validated;
        const filters: ZoneFilters = {};

        // Filter by headquarters status
        if (by === 'headquarters') {
          if (q !== 'true' && q !== 'false') {
            const error = new Error('Validation error') as Error & { validationErrors?: any[] };
            error.validationErrors = [{
              field: 'q',
              message: 'Query parameter "q" must be "true" or "false" when searching by headquarters'
            }];
            throw error;
          }
          filters.isHeadquarters = q === 'true';
        }

        return filters;
      },
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new zone.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createZone(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Extract and validate data
      // ──────────────────────────────────────────────────────────────────────
      const input = res.locals.validated.body;
      const { name, isHeadquarters, description } = input as {
        name: string;
        isHeadquarters?: boolean;
        description?: string;
      };

      // ──────────────────────────────────────────────────────────────────────
      // Check for duplicate zone name (case-insensitive)
      // ──────────────────────────────────────────────────────────────────────
      const rows = await em
        .getConnection()
        .execute(`SELECT id FROM zones WHERE LOWER(name) = ?`, [
          name.toLowerCase(),
        ]);
      if (rows.length > 0) {
        return ResponseUtil.conflict(
          res,
          'Another zone with that name already exists (case-insensitive)'
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Handle headquarters logic
      // ──────────────────────────────────────────────────────────────────────
      if (isHeadquarters === true) {
        const current = await em.findOne(Zone, { isHeadquarters: true });
        if (current) {
          current.isHeadquarters = false;
          await em.persistAndFlush(current);
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create and persist the new zone
      // ──────────────────────────────────────────────────────────────────────
      const newZone = em.create(Zone, {
        name: name,
        isHeadquarters: Boolean(isHeadquarters),
        description: description, // ✅ Agregado
      });
      await em.persistAndFlush(newZone);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.created(res, 'Zone created successfully', newZone.toDTO());
    } catch (err: any) {
      return ResponseUtil.internalError(res, 'Error creating zone', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all zones with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllZones(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Zone, {
      entityName: 'zone',
      em,
      buildFilters: () => ({}),
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single zone by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneZoneById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract zone ID
      // ──────────────────────────────────────────────────────────────────────
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch zone by ID
      // ──────────────────────────────────────────────────────────────────────
      const zone = await em.findOne(Zone, { id });
      if (!zone) {
        return ResponseUtil.notFound(res, 'Zone', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(res, 'Zone found successfully', zone);
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error finding zone', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates an existing zone.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async updateZone(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract zone ID
      // ──────────────────────────────────────────────────────────────────────
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch the zone
      // ──────────────────────────────────────────────────────────────────────
      const zone = await em.findOne(Zone, { id });
      if (!zone) {
        return ResponseUtil.notFound(res, 'Zone', id);
      }

      const input = res.locals.validated.body;

      // ──────────────────────────────────────────────────────────────────────
      // Apply updates
      // ──────────────────────────────────────────────────────────────────────
      if (input.name !== undefined) {
        const newName = input.name.trim();
        if (!newName) {
          return ResponseUtil.validationError(
            res,
            'Input data error for updating zone',
            [{ field: 'name', message: 'The name cannot be empty' }]
          );
        }

        if (newName.toLowerCase() !== zone.name.toLowerCase()) {
          const rows = await em
            .getConnection()
            .execute(`SELECT id FROM zones WHERE LOWER(name) = ? AND id != ?`, [
              newName.toLowerCase(),
              id
            ]);

          if (rows.length > 0) {
            return ResponseUtil.conflict(
              res,
              'Another zone with that name already exists (case-insensitive)'
            );
          }
        }

        zone.name = newName;
      }

      // ✅ Agregado manejo de description
      if (input.description !== undefined) {
        zone.description = input.description;
      }

      if (input.isHeadquarters !== undefined && input.isHeadquarters !== zone.isHeadquarters) {
        if (input.isHeadquarters === true) {
          const currentHQ = await em.findOne(Zone, {
            isHeadquarters: true,
            id: { $ne: zone.id },
          });

          if (currentHQ) {
            currentHQ.isHeadquarters = false;
            await em.persistAndFlush(currentHQ);
          }

          zone.isHeadquarters = true;
        } else if (input.isHeadquarters === false) {
          const otherHQs = await em.count(Zone, {
            isHeadquarters: true,
            id: { $ne: zone.id },
          });

          if (otherHQs === 0) {
            return ResponseUtil.error(
              res,
              'The headquarters cannot be removed because the system would be left without any. There must be at least one other zone as headquarters.',
              400
            );
          }

          zone.isHeadquarters = false;
        }
      }

      await em.persistAndFlush(zone);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(res, 'Zone updated successfully', zone);
    } catch (err) {
      logger.error({ err }, 'Error updating zone');
      return ResponseUtil.internalError(res, 'Error updating zone', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a zone by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteZone(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract zone ID
      // ──────────────────────────────────────────────────────────────────────
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch the zone and check for dependencies
      // ──────────────────────────────────────────────────────────────────────
      const zone = await em.findOne(Zone, { id });

      if (!zone) {
        return ResponseUtil.notFound(res, 'Zone', id);
      }

      if (zone.isHeadquarters) {
        const anotherHQ = await em.findOne(Zone, {
          isHeadquarters: true,
          id: { $ne: zone.id },
        });

        if (!anotherHQ) {
          return ResponseUtil.error(
            res,
            'This zone cannot be deleted because it is the current headquarters. You must first mark another zone as headquarters before deleting it.',
            400
          );
        }
      }
      const authorities = await em.find(Authority, { zone: zone });

      if (authorities.length > 0) {
        return ResponseUtil.error(
          res,
          `The zone cannot be deleted because it has ${authorities.length} associated authority(s).`,
          400
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the zone
      // ──────────────────────────────────────────────────────────────────────
      await em.removeAndFlush(zone);
      return ResponseUtil.deleted(res, 'Zone deleted successfully');
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error deleting zone', err);
    }
  }
}