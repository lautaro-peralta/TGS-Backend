// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { RoleRequestController } from './roleRequest.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth.middleware.js';
import { validateWithSchema } from '../../../shared/middleware/validation.middleware.js';
import { createRoleRequestSchema, reviewRoleRequestSchema } from './roleRequest.schema.js';
import { Role } from '../user/user.entity.js';

// ============================================================================
// ROUTER - Role Request
// ============================================================================
export const roleRequestRouter = Router();
const roleRequestController = new RoleRequestController();

// ──────────────────────────────────────────────────────────────────────────
// USER ROUTES (Authenticated)
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/role-requests
 * @desc    Create a new role request (PARTNER, DISTRIBUTOR, or AUTHORITY)
 * @access  Private (Authenticated users)
 */
roleRequestRouter.post(
  '/',
  authMiddleware,
  validateWithSchema({ body: createRoleRequestSchema }),
  roleRequestController.createRequest
);

/**
 * @route   GET /api/role-requests/me
 * @desc    Get all role requests for the authenticated user
 * @access  Private (Authenticated users)
 */
roleRequestRouter.get(
  '/me',
  authMiddleware,
  roleRequestController.getMyRequests
);

// ──────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/role-requests/pending
 * @desc    Get all pending role requests (Admin inbox)
 * @access  Private (Admin only)
 */
roleRequestRouter.get(
  '/pending',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  roleRequestController.getPendingRequests
);

/**
 * @route   GET /api/role-requests
 * @desc    Search role requests with filters
 * @access  Private (Admin only)
 */
roleRequestRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  roleRequestController.searchRequests
);

/**
 * @route   PUT /api/role-requests/:id/review
 * @desc    Review a role request (approve or reject)
 * @access  Private (Admin only)
 */
roleRequestRouter.put(
  '/:id/review',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema(reviewRoleRequestSchema),
  roleRequestController.reviewRequest
);
