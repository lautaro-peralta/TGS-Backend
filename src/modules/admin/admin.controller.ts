// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Admin } from './admin.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import { searchAdminsSchema } from './admin.schema.js';

// ============================================================================
// CONTROLLER - Admin
// ============================================================================

/**
 * Controller for handling admin-related operations.
 * @class AdminController
 */
export class AdminController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search for admins based on various criteria.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by name or department
   * - by: 'name' | 'department' - Field to search (default: 'name')
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchAdmins(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchAdminsSchema);
    if (!validated) return;

    return searchEntityWithPagination(req, res, Admin, {
      entityName: 'admin',
      em,
      searchFields: (() => {
        const { by } = validated;
        return by === 'department' ? 'department' : 'name';
      })(),
      buildFilters: () => ({}),
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new admin.
   */
  async createAdmin(req: Request, res: Response) {
    const em = orm.em.fork();
    const validatedData = res.locals.validated.body;

    try {
      // Check if admin already exists
      const adminExists = await em.findOne(Admin, { dni: validatedData.dni });
      if (adminExists) {
        return ResponseUtil.conflict(res, 'An admin with that DNI already exists.', 'dni');
      }

      // Check if base person exists
      let basePerson = await em.findOne(BasePersonEntity, { dni: validatedData.dni });

      if (!basePerson) {
        basePerson = em.create(BasePersonEntity, {
          dni: validatedData.dni,
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone ?? '-',
          address: validatedData.address ?? '-',
        });
        await em.persistAndFlush(basePerson);
      }

      // Create admin
      const admin = em.create(Admin, {
        dni: basePerson.dni,
        name: basePerson.name,
        email: basePerson.email,
        phone: basePerson.phone,
        address: basePerson.address,
        department: validatedData.department,
      });

      await em.persistAndFlush(admin);

      return ResponseUtil.created(res, 'Admin created successfully', admin.toDTO());
    } catch (err: any) {
      console.error('Error creating admin:', err);
      return ResponseUtil.internalError(res, 'Error creating admin', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all admins with pagination.
   */
  async getAllAdmins(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Admin, {
      entityName: 'admin',
      em,
      buildFilters: () => ({}),
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single admin by DNI.
   */
  async getOneAdminByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const dni = req.params.dni.trim();
      if (!dni) {
        return ResponseUtil.validationError(res, 'Invalid DNI', [
          { field: 'dni', message: 'The DNI is required' },
        ]);
      }

      const admin = await em.findOne(Admin, { dni });
      if (!admin) {
        return ResponseUtil.notFound(res, 'Admin', dni);
      }

      return ResponseUtil.success(res, 'Admin found successfully', admin.toDTO());
    } catch (err) {
      console.error('Error searching for admin:', err);
      return ResponseUtil.internalError(res, 'Error searching for the admin', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates an admin.
   */
  async updateAdmin(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const dni = req.params.dni.trim();
      if (!dni) {
        return ResponseUtil.validationError(res, 'Invalid DNI', [
          { field: 'dni', message: 'The DNI is required' },
        ]);
      }

      const admin = await em.findOne(Admin, { dni });
      if (!admin) {
        return ResponseUtil.notFound(res, 'Admin', dni);
      }

      const validatedData = res.locals.validated.body;

      // Update fields
      if (validatedData.name !== undefined) admin.name = validatedData.name;
      if (validatedData.email !== undefined) admin.email = validatedData.email;
      if (validatedData.phone !== undefined) admin.phone = validatedData.phone;
      if (validatedData.address !== undefined) admin.address = validatedData.address;
      if (validatedData.department !== undefined) admin.department = validatedData.department;

      await em.flush();

      return ResponseUtil.updated(res, 'Admin updated successfully', admin.toDTO());
    } catch (err) {
      console.error('Error updating admin:', err);
      return ResponseUtil.internalError(res, 'Error updating admin', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes an admin by DNI.
   */
  async deleteAdmin(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const dni = req.params.dni.trim();
      if (!dni) {
        return ResponseUtil.validationError(res, 'Invalid DNI', [
          { field: 'dni', message: 'The DNI is required' },
        ]);
      }

      const admin = await em.findOne(Admin, { dni });
      if (!admin) {
        return ResponseUtil.notFound(res, 'Admin', dni);
      }

      await em.removeAndFlush(admin);

      return ResponseUtil.deleted(res, 'Admin deleted successfully');
    } catch (err) {
      console.error('Error deleting admin:', err);
      return ResponseUtil.internalError(res, 'Error deleting admin', err);
    }
  }
}
