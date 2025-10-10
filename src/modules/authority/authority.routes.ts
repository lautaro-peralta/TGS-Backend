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
import { AuthorityController } from './authority.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createAuthoritySchema,
  updateAuthoritySchema,
  partialUpdateAuthoritySchema,
} from './authority.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Authority
// ============================================================================
export const authorityRouter = Router();
const authorityController = new AuthorityController();

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
 * @route   GET /api/authorities/search
 * @desc    Search for authorities.
 * @access  Private (Admin only)
 */
authorityRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  authorityController.searchAuthorities
);

/**
 * @route   POST /api/authorities
 * @desc    Create a new authority.
 * @access  Private (Admin only)
 */
authorityRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: createAuthoritySchema }),
  authorityController.createAuthority
);

/**
 * @route   GET /api/authorities
 * @desc    Get all authorities.
 * @access  Private (Admin only)
 */
authorityRouter.get(
  '/',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  authorityController.getAllAuthorities
);

/**
 * @route   GET /api/authorities/:dni
 * @desc    Get an authority by DNI.
 * @access  Private (Admin only)
 */
authorityRouter.get(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: dniParamSchema }),
  authorityController.getOneAuthorityByDni
);

/**
 * @route   GET /api/authorities/:dni/bribes
 * @desc    Get bribes for a specific authority.
 * @access  Private (Admin and Authority only)
 */
authorityRouter.get(
  '/:dni/bribes',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.AUTHORITY]),
  authorityController.getAuthorityBribes
);

/**
 * @route   PUT /api/authorities/:dni
 * @desc    Update an authority by DNI.
 * @access  Private (Admin and Authority only)
 */
authorityRouter.put(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN, Role.AUTHORITY]),
  validateWithSchema({ body: updateAuthoritySchema }),
  authorityController.putUpdateAuthority
);

/**
 * @route   PATCH /api/authorities/:dni
 * @desc    Partially update an authority by DNI.
 * @access  Private (Admin and Authority only)
 */
authorityRouter.patch(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN, Role.AUTHORITY]),
  validateWithSchema({ body: partialUpdateAuthoritySchema }),
  authorityController.patchUpdateAuthority
);

/**
 * @route   DELETE /api/authorities/:dni
 * @desc    Delete an authority by DNI.
 * @access  Private (Admin and Authority only)
 */
authorityRouter.delete(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN, Role.AUTHORITY]),
  authorityController.deleteAuthority
);
