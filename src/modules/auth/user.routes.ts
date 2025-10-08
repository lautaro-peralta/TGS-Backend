// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { UserController } from './user.controller.js';
import { authMiddleware, rolesMiddleware } from './auth.middleware.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import { changeRoleSchema } from './user.schema.js';
import { Role } from '../auth/user.entity.js';

// ============================================================================
// ROUTER - User
// ============================================================================
export const userRouter = Router();
const userController = new UserController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/users/me
 * @desc    Get authenticated user profile.
 * @access  Private
 */
userRouter.get('/me', authMiddleware, userController.getUserProfile);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Change user role.
 * @access  Private (Admin only)
 */
userRouter.patch(
  '/:id/role',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema(changeRoleSchema),
  userController.updateUserRoles
);

/**
 * @route   GET /api/users
 * @desc    Get all users.
 * @access  Private (Admin only)
 */
userRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  userController.getAllUsers
);

/**
 * @route   GET /api/users/:identifier
 * @desc    Get user by id or username.
 * @access  Private (Admin only)
 */
userRouter.get(
  '/:identifier',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  userController.getOneUserById
);