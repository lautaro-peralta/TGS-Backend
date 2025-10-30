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
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: Retrieves the authenticated user's profile information
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
userRouter.get('/me', authMiddleware, userController.getUserProfile);

/**
 * @swagger
 * /api/users/me/complete-profile:
 *   put:
 *     tags: [Users]
 *     summary: Complete user profile
 *     description: Complete authenticated user's profile with personal information (DNI, phone, address)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dni
 *               - name
 *               - phone
 *               - address
 *             properties:
 *               dni:
 *                 type: string
 *                 minLength: 7
 *                 maxLength: 10
 *                 example: "12345678"
 *               name:
 *                 type: string
 *                 example: "Thomas Shelby"
 *               phone:
 *                 type: string
 *                 example: "+44 121 496 0000"
 *               address:
 *                 type: string
 *                 example: "6 Watery Lane, Birmingham"
 *     responses:
 *       200:
 *         description: Profile completed successfully
 *       400:
 *         description: Validation error or profile already completed
 *       401:
 *         description: Unauthorized
 */
userRouter.put(
  '/me/complete-profile',
  authMiddleware,
  validateWithSchema({ body: completeProfileSchema }),
  userController.completeProfile
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user properties (Admin only)
 *     description: Updates user's verification status, email verification, active status, and roles
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User's ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isVerified:
 *                 type: boolean
 *                 example: true
 *               emailVerified:
 *                 type: boolean
 *                 example: true
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [ADMIN, CLIENT, PARTNER, DISTRIBUTOR, AUTHORITY]
 *                 example: ["CLIENT"]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 */
userRouter.put(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema(updateUserSchema),
  userController.updateUser
);

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change user role (Admin only)
 *     description: Updates a specific user's role in the system
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User's ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, CLIENT, PARTNER, DISTRIBUTOR, AUTHORITY]
 *                 example: "PARTNER"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 */
userRouter.patch(
  '/:id/role',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema(changeRoleSchema),
  userController.updateUserRoles
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
 *     description: Retrieves a list of all users in the system
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
userRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  userController.getAllUsers
);

/**
 * @swagger
 * /api/users/{identifier}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID or username (Admin only)
 *     description: Retrieves a specific user by their ID or username
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: User's ID (UUID) or username
 *         example: "thomas_shelby"
 *     responses:
 *       200:
 *         description: User found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 */
userRouter.get(
  '/:identifier',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  userController.getOneUserById
);