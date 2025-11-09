// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { ShelbyCouncil } from './shelbyCouncil.entity.js';
import { Partner } from '../partner/partner.entity.js';
import { StrategicDecision } from '../decision/decision.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { searchShelbyCouncilSchema } from './shelbyCouncil.schema.js';
import { EntityFilters } from '../../shared/types/common.types.js';

// ============================================================================
// CONTROLLER - ConsejoShelby
// ============================================================================

/**
 * Controller for handling consejo shelby-related operations.
 * @class ConsejoShelbyController
 */
export class ShelbyCouncilController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search for consejos shelby based on various criteria.
   *
   * Query params:
   * - partnerDni: string - Filter by partner DNI
   * - decisionId: number - Filter by decision ID
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchShelbyCouncil(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchShelbyCouncilSchema);
    if (!validated) return;

    return searchEntityWithPagination(req, res, ShelbyCouncil, {
      entityName: 'consejo-shelby',
      em,
      buildFilters: () => {
        const { partnerDni, decisionId } = validated;
        const filters: EntityFilters = {};

        if (partnerDni) {
          filters.partner = { dni: partnerDni };
        }

        if (decisionId) {
          filters.decision = { id: decisionId };
        }

        return filters;
      },
      populate: ['partner', 'decision'] as any,
      orderBy: { joinDate: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new consejo shelby.
   */
  async createShelbyCouncil(req: Request, res: Response) {
    const em = orm.em.fork();
    const validatedData = res.locals.validated.body;

    try {
      // Find partner
      const partner = await em.findOne(Partner, { dni: validatedData.partnerDni });
      if (!partner) {
        return ResponseUtil.notFound(res, 'Partner', validatedData.partnerDni);
      }

      // Find decision
      const decision = await em.findOne(StrategicDecision, { id: validatedData.decisionId });
      if (!decision) {
        return ResponseUtil.notFound(res, 'Strategic Decision', validatedData.decisionId);
      }

      // Check if relationship already exists
      const exists = await em.findOne(ShelbyCouncil, {
        partner: partner.id,
        decision: decision.id,
      });
      if (exists) {
        return ResponseUtil.conflict(
          res,
          'This partner is already associated with this decision.',
          'partnerDni'
        );
      }

      // Create consejo shelby
      const shelbyCouncil = em.create(ShelbyCouncil, {
        partner,
        decision,
        joinDate: validatedData.joinDate ? new Date(validatedData.joinDate) : new Date(),
        role: validatedData.role,
        notes: validatedData.notes,
      });

      await em.persistAndFlush(shelbyCouncil);

      const result = await em.findOne(
        ShelbyCouncil,
        { id: shelbyCouncil.id },
        { populate: ['partner', 'decision'] }
      );

      return ResponseUtil.created(
        res,
        'Consejo Shelby created successfully',
        result?.toDTO() || shelbyCouncil.toDTO()
      );
    } catch (err: any) {
      logger.error({ err }, 'Error creating consejo shelby');
      return ResponseUtil.internalError(res, 'Error creating consejo shelby', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all consejos shelby with pagination.
   */
  async getAllConsejosShelby(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, ShelbyCouncil, {
      entityName: 'shelbyCouncil',
      em,
      buildFilters: () => ({}),
      populate: ['partner', 'decision'] as any,
      orderBy: { joinDate: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single consejo shelby by ID.
   */
  async getOneShelbyCouncilById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const shelbyCouncil = await em.findOne(
        ShelbyCouncil,
        { id },
        { populate: ['partner', 'decision'] }
      );
      if (!shelbyCouncil) {
        return ResponseUtil.notFound(res, 'Consejo Shelby', id);
      }

      return ResponseUtil.success(
        res,
        'Consejo Shelby found successfully',
        shelbyCouncil.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error searching for consejo shelby');
      return ResponseUtil.internalError(res, 'Error searching for consejo shelby', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates a consejo shelby.
   */
  async updateConsejoShelby(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const shelbyCouncil = await em.findOne(
        ShelbyCouncil,
        { id },
        { populate: ['partner', 'decision'] }
      );
      if (!shelbyCouncil) {
        return ResponseUtil.notFound(res, 'ShelbyCouncil', id);
      }

      const validatedData = res.locals.validated.body;

      // Update fields
      if (validatedData.joinDate !== undefined) {
        shelbyCouncil.joinDate = new Date(validatedData.joinDate);
      }
      if (validatedData.role !== undefined) shelbyCouncil.role = validatedData.role;
      if (validatedData.notes !== undefined) shelbyCouncil.notes = validatedData.notes;

      await em.flush();

      return ResponseUtil.updated(
        res,
        'Consejo Shelby updated successfully',
        shelbyCouncil.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error updating consejo shelby');
      return ResponseUtil.internalError(res, 'Error updating consejo shelby', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a consejo shelby by ID.
   */
  async deleteShelbyCouncil(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const shelbyCouncil = await em.findOne(ShelbyCouncil, { id });
      if (!shelbyCouncil) {
        return ResponseUtil.notFound(res, 'Consejo Shelby', id);
      }

      await em.removeAndFlush(shelbyCouncil);

      return ResponseUtil.deleted(res, 'Consejo Shelby deleted successfully');
    } catch (err) {
      logger.error({ err }, 'Error deleting consejo shelby');
      return ResponseUtil.internalError(res, 'Error deleting consejo shelby', err);
    }
  }
}
