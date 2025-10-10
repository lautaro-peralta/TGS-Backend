// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { ClandestineAgreement, AgreementStatus } from './clandestineAgreement.entity.js';
import { ShelbyCouncil } from '../shelbyCouncil/shelbyCouncil.entity.js';
import { Admin } from '../admin/admin.entity.js';
import { Authority } from '../authority/authority.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import { searchClandestineAgreementsSchema } from './clandestineAgreement.schema.js';

// ============================================================================
// CONTROLLER - ClandestineAgreement
// ============================================================================

/**
 * Controller for handling clandestine agreement-related operations.
 * @class ClandestineAgreementController
 */
export class ClandestineAgreementController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search for clandestine agreements based on various criteria.
   *
   * Query params:
   * - shelbyCouncilId: number - Filter by Shelby Council ID
   * - adminDni: string - Filter by admin DNI
   * - authorityDni: string - Filter by authority DNI
   * - status: AgreementStatus - Filter by status (ACTIVE, COMPLETED, CANCELLED)
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchClandestineAgreements(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchClandestineAgreementsSchema);
    if (!validated) return;

    return searchEntityWithPagination(req, res, ClandestineAgreement, {
      entityName: 'clandestine-agreement',
      em,
      buildFilters: () => {
        const { shelbyCouncilId, adminDni, authorityDni, status } = validated;
        const filters: any = {};

        if (shelbyCouncilId) {
          filters.shelbyCouncil = { id: shelbyCouncilId };
        }

        if (adminDni) {
          filters.admin = { dni: adminDni };
        }

        if (authorityDni) {
          filters.authority = { dni: authorityDni };
        }

        if (status) {
          filters.status = status;
        }

        return filters;
      },
      populate: ['shelbyCouncil', 'admin', 'authority'] as any,
      orderBy: { agreementDate: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new clandestine agreement.
   */
  async createClandestineAgreement(req: Request, res: Response) {
    const em = orm.em.fork();
    const validatedData = res.locals.validated.body;

    try {
      // Find shelby council
      const shelbyCouncil = await em.findOne(ShelbyCouncil, {
        id: validatedData.shelbyCouncilId,
      });
      if (!shelbyCouncil) {
        return ResponseUtil.notFound(res, 'Shelby Council', validatedData.shelbyCouncilId);
      }

      // Find admin
      const admin = await em.findOne(Admin, { dni: validatedData.adminDni });
      if (!admin) {
        return ResponseUtil.notFound(res, 'Admin', validatedData.adminDni);
      }

      // Find authority
      const authority = await em.findOne(Authority, { dni: validatedData.authorityDni });
      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', validatedData.authorityDni);
      }

      // Create clandestine agreement
      const clandestineAgreement = em.create(ClandestineAgreement, {
        shelbyCouncil,
        admin,
        authority,
        agreementDate: validatedData.agreementDate
          ? new Date(validatedData.agreementDate)
          : new Date(),
        description: validatedData.description,
        status: validatedData.status ?? AgreementStatus.ACTIVE,
      });

      await em.persistAndFlush(clandestineAgreement);

      const result = await em.findOne(
        ClandestineAgreement,
        { id: clandestineAgreement.id },
        { populate: ['shelbyCouncil', 'admin', 'authority'] }
      );

      return ResponseUtil.created(
        res,
        'Clandestine Agreement created successfully',
        result?.toDTO() || clandestineAgreement.toDTO()
      );
    } catch (err: any) {
      console.error('Error creating clandestine agreement:', err);
      return ResponseUtil.internalError(res, 'Error creating clandestine agreement', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all clandestine agreements with pagination.
   */
  async getAllClandestineAgreements(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, ClandestineAgreement, {
      entityName: 'clandestine-agreement',
      em,
      buildFilters: () => ({}),
      populate: ['shelbyCouncil', 'admin', 'authority'] as any,
      orderBy: { agreementDate: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single clandestine agreement by ID.
   */
  async getOneClandestineAgreementById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const clandestineAgreement = await em.findOne(
        ClandestineAgreement,
        { id },
        { populate: ['shelbyCouncil', 'admin', 'authority'] }
      );
      if (!clandestineAgreement) {
        return ResponseUtil.notFound(res, 'Clandestine Agreement', id);
      }

      return ResponseUtil.success(
        res,
        'Clandestine Agreement found successfully',
        clandestineAgreement.toDTO()
      );
    } catch (err) {
      console.error('Error searching for clandestine agreement:', err);
      return ResponseUtil.internalError(res, 'Error searching for clandestine agreement', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates a clandestine agreement.
   */
  async updateClandestineAgreement(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const clandestineAgreement = await em.findOne(
        ClandestineAgreement,
        { id },
        { populate: ['shelbyCouncil', 'admin', 'authority'] }
      );
      if (!clandestineAgreement) {
        return ResponseUtil.notFound(res, 'Clandestine Agreement', id);
      }

      const validatedData = res.locals.validated.body;

      // Update fields
      if (validatedData.agreementDate !== undefined) {
        clandestineAgreement.agreementDate = new Date(validatedData.agreementDate);
      }
      if (validatedData.description !== undefined) {
        clandestineAgreement.description = validatedData.description;
      }
      if (validatedData.status !== undefined) {
        clandestineAgreement.status = validatedData.status;
      }

      await em.flush();

      return ResponseUtil.updated(
        res,
        'Clandestine Agreement updated successfully',
        clandestineAgreement.toDTO()
      );
    } catch (err) {
      console.error('Error updating clandestine agreement:', err);
      return ResponseUtil.internalError(res, 'Error updating clandestine agreement', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a clandestine agreement by ID.
   */
  async deleteClandestineAgreement(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const clandestineAgreement = await em.findOne(ClandestineAgreement, { id });
      if (!clandestineAgreement) {
        return ResponseUtil.notFound(res, 'Clandestine Agreement', id);
      }

      await em.removeAndFlush(clandestineAgreement);

      return ResponseUtil.deleted(res, 'Clandestine Agreement deleted successfully');
    } catch (err) {
      console.error('Error deleting clandestine agreement:', err);
      return ResponseUtil.internalError(res, 'Error deleting clandestine agreement', err);
    }
  }
}