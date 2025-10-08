// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import { payBribesSchema } from './bribe.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { BribeController } from './bribe.controller.js';
import { Role } from '../auth/user.entity.js';

// ============================================================================
// ROUTER - Bribe
// ============================================================================
export const bribeRouter = Router();
const bribeController = new BribeController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/bribes
 * @desc    Get all bribes.
 * @access  Private (Admin only)
 */

bribeRouter.get('/search', authMiddleware, rolesMiddleware([Role.ADMIN]), bribeController.searchBribes);
bribeRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  bribeController.getAllBribes
);

/**
 * @route   GET /api/bribes/:id
 * @desc    Get a single bribe by ID.
 * @access  Private (Admin only)
 */
bribeRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  bribeController.getOneBribeById
);

/**
 * @route   PATCH /api/bribes/pay
 * @desc    Mark multiple bribes as paid.
 * @access  Private (Admin only)
 */
bribeRouter.patch(
  '/pay',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: payBribesSchema }),
  bribeController.payBribes
);

/**
 * @route   PATCH /api/bribes/:id/pay
 * @desc    Mark a single bribe as paid.
 * @access  Private (Admin only)
 */
bribeRouter.patch(
  '/:id/pay',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: payBribesSchema }),
  bribeController.payBribes
);

/**
 * @route   DELETE /api/bribes/:id
 * @desc    Delete a bribe by ID.
 * @access  Private (Admin only)
 */
bribeRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  bribeController.deleteBribe
);