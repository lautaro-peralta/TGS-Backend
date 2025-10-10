// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { UserController } from './user.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth.middleware.js';
import { validateWithSchema } from '../../../shared/middleware/validation.middleware.js';
import { changeRoleSchema, completeProfileSchema, updateUserSchema } from './user.schema.js';
import { Role } from './user.entity.js';

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
 * @route   PUT /api/users/me/complete-profile
 * @desc    Complete user profile with personal information.
 * @access  Private
 */
userRouter.put(
  '/me/complete-profile',
  authMiddleware,
  validateWithSchema({ body: completeProfileSchema }),
  userController.completeProfile
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user properties (emailVerified, isActive, roles, profileCompleteness).
 * @access  Private (Admin only)
 */
userRouter.put(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema(updateUserSchema),
  userController.updateUser
);

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