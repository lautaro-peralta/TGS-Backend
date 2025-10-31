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
} from '../auth/auth.middleware.js';
import { ShelbyCouncilController } from './shelbyCouncil.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createShelbyCouncilSchema,
  updateShelbyCouncilSchema,
} from './shelbyCouncil.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - ConsejoShelby
// ============================================================================
export const shelbyCouncilRouter = Router();
const shelbyCouncilController = new ShelbyCouncilController();

/**
 * Zod schema for ID parameter validation.
 */
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/shelby-council/search
 * @desc    Search for shelby council records.
 * @access  Private (Admin, Partner, Authority)
 */
shelbyCouncilRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]),
  shelbyCouncilController.searchShelbyCouncil
);

/**
 * @route   POST /api/shelby-council
 * @desc    Create a new shelby council record.
 * @access  Private (Admin and Partner only)
 */
shelbyCouncilRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ body: createShelbyCouncilSchema }),
  shelbyCouncilController.createShelbyCouncil
);

/**
 * @route   GET /api/shelby-council
 * @desc    Get all shelby council records.
 * @access  Private (Admin, Partner, Authority)
 */
shelbyCouncilRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]),
  shelbyCouncilController.getAllConsejosShelby
);

/**
 * @route   GET /api/shelby-council/:id
 * @desc    Get a shelby council record by ID.
 * @access  Private (Admin, Partner, Authority)
 */
shelbyCouncilRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]),
  validateWithSchema({ params: idParamSchema }),
  shelbyCouncilController.getOneShelbyCouncilById
);

/**
 * @route   PUT /api/shelby-council/:id
 * @desc    Update a shelby council record by ID.
 * @access  Private (Admin and Partner only)
 */
shelbyCouncilRouter.put(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ params: idParamSchema, body: updateShelbyCouncilSchema }),
  shelbyCouncilController.updateConsejoShelby
);

/**
 * @route   DELETE /api/shelby-council/:id
 * @desc    Delete a shelby council record by ID.
 * @access  Private (Admin and Partner only)
 */
shelbyCouncilRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ params: idParamSchema }),
  shelbyCouncilController.deleteShelbyCouncil
);
