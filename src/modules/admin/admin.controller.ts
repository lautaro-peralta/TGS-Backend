// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Admin } from './admin.entity.js';
import { User, Role } from '../auth/user/user.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination, searchEntityWithPaginationCached } from '../../shared/utils/search.util.js';
import { CACHE_TTL } from '../../shared/services/cache.service.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
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

    return searchEntityWithPaginationCached(req, res, Admin, {
      entityName: 'admin',
      em,
      searchFields: (() => {
        const { by } = validated;
        return by === 'department' ? 'department' : 'name';
      })(),
      buildFilters: () => ({}),
      orderBy: { name: 'ASC' } as any,
      useCache: true,
      cacheTtl: CACHE_TTL.AUTHORITY_LIST,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new admin and assigns the ADMIN role to the user.
   * 
   * 
   * Process:
   * 1. Validates DNI doesn't already exist as admin
   * 2. Finds user by DNI (must exist)
   * 3. Creates/updates BasePersonEntity
   * 4. Creates Admin record
   * 5. ⭐ ADDS ADMIN ROLE to user if not present
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

      // 2️⃣ Find the user by DNI (via person relationship)
      const user = await em.findOne(User, { person: { dni: validatedData.dni } }, {
        populate: ['person']
      });
      
      if (!user) {
        logger.warn({ dni: validatedData.dni }, '⚠️ User not found for admin creation');
        return ResponseUtil.notFound(
          res, 
          'User',
          validatedData.dni
        );
      }

      // Unwrap the person reference if needed
      const personEntity = user.person instanceof Object && 'getEntity' in user.person 
        ? (user.person as any).getEntity() 
        : user.person;

      logger.info({ 
        userId: user.id, 
        dni: personEntity?.dni 
      }, '🔍 Found user for admin creation');

      // 3️⃣ Check if base person exists, create if not
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
        logger.info({ dni: validatedData.dni }, '📝 Created new BasePersonEntity');
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
      logger.info({ dni: admin.dni }, '✅ Admin record created');

      // 5️⃣ ⭐ ADD ADMIN ROLE to user (THE CRITICAL FIX)
      if (!user.roles.includes(Role.ADMIN)) {
        user.roles.push(Role.ADMIN);
        await em.persistAndFlush(user);
        logger.info({ 
          userId: user.id, 
          dni: personEntity?.dni,
          roles: user.roles 
        }, '👑 ADMIN role assigned to user');
      } else {
        logger.info({ userId: user.id }, '⚠️ User already has ADMIN role');
      }

      return ResponseUtil.created(
        res, 
        `Admin created successfully and ADMIN role assigned to user ${user.username}`,
        admin.toDTO()
      );
    } catch (err: any) {
      logger.error({ err, dni: validatedData.dni }, '❌ Error creating admin');
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
      logger.error({ err }, 'Error searching for admin');
      return ResponseUtil.internalError(res, 'Error searching for the admin', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates an admin.
   * Note: Does not modify user roles (use dedicated role management endpoints for that)
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

      logger.info({ dni: admin.dni }, '✅ Admin updated');

      return ResponseUtil.updated(res, 'Admin updated successfully', admin.toDTO());
    } catch (err) {
      logger.error({ err }, 'Error updating admin');
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

      // 1️⃣ Find the user to remove ADMIN role
      const user = await em.findOne(User, { person: { dni } }, {
        populate: ['person']
      });

      // 2️⃣ Remove admin record
      await em.removeAndFlush(admin);
      logger.info({ dni }, '🗑️ Admin record deleted');

      // 3️⃣ ⭐ REMOVE ADMIN ROLE from user (THE CRITICAL FIX)
      if (user && user.roles.includes(Role.ADMIN)) {
        user.roles = user.roles.filter(role => role !== Role.ADMIN);
        await em.persistAndFlush(user);
        logger.info({ 
          userId: user.id, 
          dni,
          roles: user.roles 
        }, '👑 ADMIN role removed from user');
      }

      return ResponseUtil.deleted(
        res, 
        user 
          ? `Admin deleted successfully and ADMIN role removed from user ${user.username}`
          : 'Admin deleted successfully'
      );
    } catch (err) {
      logger.error({ err }, 'Error deleting admin');
      return ResponseUtil.internalError(res, 'Error deleting admin', err);
    }
  }
}
