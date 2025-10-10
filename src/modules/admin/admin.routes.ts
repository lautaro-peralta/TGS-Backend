// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';
import { z } from 'zod';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import {
  authMiddleware,
  rolesMiddleware,
} from '../../modules/auth/auth.middleware.js';
import { AdminController } from './admin.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createAdminSchema,
  updateAdminSchema,
} from './admin.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Admin
// ============================================================================
export const adminRouter = Router();
const adminController = new AdminController();

/**
 * Zod schema for DNI parameter validation.
 */
const dniParamSchema = z.object({
  dni: z.string().min(7).max(10),
});

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/admin/search
 * @desc    Search for admins.
 * @access  Private (Admin only)
 */
adminRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  adminController.searchAdmins
);

/**
 * @route   POST /api/admin
 * @desc    Create a new admin.
 * @access  Private (Admin only)
 */
adminRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: createAdminSchema }),
  adminController.createAdmin
);

/**
 * @route   GET /api/admin
 * @desc    Get all admins.
 * @access  Private (Admin only)
 */
adminRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  adminController.getAllAdmins
);

/**
 * @route   GET /api/admin/:dni
 * @desc    Get an admin by DNI.
 * @access  Private (Admin only)
 */
adminRouter.get(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: dniParamSchema }),
  adminController.getOneAdminByDni
);

/**
 * @route   PUT /api/admin/:dni
 * @desc    Update an admin by DNI.
 * @access  Private (Admin only)
 */
adminRouter.put(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: dniParamSchema, body: updateAdminSchema }),
  adminController.updateAdmin
);

/**
 * @route   DELETE /api/admin/:dni
 * @desc    Delete an admin by DNI.
 * @access  Private (Admin only)
 */
adminRouter.delete(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: dniParamSchema }),
  adminController.deleteAdmin
);