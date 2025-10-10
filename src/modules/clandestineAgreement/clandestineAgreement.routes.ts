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
import { ClandestineAgreementController } from './clandestineAgreement.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createClandestineAgreementSchema,
  updateClandestineAgreementSchema,
} from './clandestineAgreement.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - ClandestineAgreement
// ============================================================================
export const clandestineAgreementRouter = Router();
const clandestineAgreementController = new ClandestineAgreementController();

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
 * @route   GET /api/clandestine-agreements/search
 * @desc    Search for clandestine agreements.
 * @access  Private (Admin only)
 */
clandestineAgreementRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  clandestineAgreementController.searchClandestineAgreements
);

/**
 * @route   POST /api/clandestine-agreements
 * @desc    Create a new clandestine agreement.
 * @access  Private (Admin only)
 */
clandestineAgreementRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: createClandestineAgreementSchema }),
  clandestineAgreementController.createClandestineAgreement
);

/**
 * @route   GET /api/clandestine-agreements
 * @desc    Get all clandestine agreements.
 * @access  Private (Admin only)
 */
clandestineAgreementRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  clandestineAgreementController.getAllClandestineAgreements
);

/**
 * @route   GET /api/clandestine-agreements/:id
 * @desc    Get a clandestine agreement by ID.
 * @access  Private (Admin only)
 */
clandestineAgreementRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: idParamSchema }),
  clandestineAgreementController.getOneClandestineAgreementById
);

/**
 * @route   PUT /api/clandestine-agreements/:id
 * @desc    Update a clandestine agreement by ID.
 * @access  Private (Admin only)
 */
clandestineAgreementRouter.put(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: idParamSchema, body: updateClandestineAgreementSchema }),
  clandestineAgreementController.updateClandestineAgreement
);

/**
 * @route   DELETE /api/clandestine-agreements/:id
 * @desc    Delete a clandestine agreement by ID.
 * @access  Private (Admin only)
 */
clandestineAgreementRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: idParamSchema }),
  clandestineAgreementController.deleteClandestineAgreement
);
