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
 * @swagger
 * /api/role-requests:
 *   post:
 *     tags: [Role Requests]
 *     summary: Create role request
 *     description: Submit a request to become a PARTNER, DISTRIBUTOR, or AUTHORITY. Users can request role changes or additions with justification.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestedRole
 *             properties:
 *               requestedRole:
 *                 type: string
 *                 enum: [PARTNER, DISTRIBUTOR, AUTHORITY]
 *                 description: The role being requested
 *                 example: "PARTNER"
 *               roleToRemove:
 *                 type: string
 *                 enum: [PARTNER, DISTRIBUTOR, AUTHORITY, ADMIN]
 *                 description: Optional - Role to remove (for role swap requests)
 *                 example: "DISTRIBUTOR"
 *               justification:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 500
 *                 description: Reason for the role request
 *                 example: "I have proven my loyalty to the Shelby family through years of successful distribution in Small Heath. I wish to become a partner to expand operations into London."
 *               additionalData:
 *                 type: object
 *                 description: Additional data required for specific roles
 *                 properties:
 *                   zoneId:
 *                     type: integer
 *                     description: Required for DISTRIBUTOR and AUTHORITY roles
 *                     example: 1
 *                   address:
 *                     type: string
 *                     description: Required for DISTRIBUTOR role
 *                     example: "Watery Lane, Small Heath, Birmingham"
 *                   productsIds:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     description: Optional for DISTRIBUTOR role
 *                     example: [1, 2, 3]
 *                   rank:
 *                     type: string
 *                     enum: ['0', '1', '2', '3']
 *                     description: Required for AUTHORITY role (0=Officer, 1=Sergeant, 2=Inspector, 3=Chief)
 *                     example: "2"
 *     responses:
 *       201:
 *         description: Role request created successfully
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
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     requestedRole:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "PENDING"
 *       400:
 *         description: Invalid request body or validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       409:
 *         description: User already has a pending request for this role
 */
roleRequestRouter.post(
  '/',
  authMiddleware,
  validateWithSchema({ body: createRoleRequestSchema }),
  roleRequestController.createRequest
);

/**
 * @swagger
 * /api/role-requests/me:
 *   get:
 *     tags: [Role Requests]
 *     summary: Get my role requests
 *     description: Retrieves all role requests submitted by the authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of user's role requests
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
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       requestedRole:
 *                         type: string
 *                         example: "PARTNER"
 *                       roleToRemove:
 *                         type: string
 *                       status:
 *                         type: string
 *                         example: "PENDING"
 *                       justification:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       reviewedAt:
 *                         type: string
 *                         format: date-time
 *                       adminComments:
 *                         type: string
 *       401:
 *         description: Unauthorized - Authentication required
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
 * @swagger
 * /api/role-requests/pending:
 *   get:
 *     tags: [Role Requests]
 *     summary: Get pending requests (Admin)
 *     description: Retrieves all pending role requests awaiting admin review
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of pending role requests
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
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       requestedRole:
 *                         type: string
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           name:
 *                             type: string
 *                       status:
 *                         type: string
 *                         example: "PENDING"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
roleRequestRouter.get(
  '/pending',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  roleRequestController.getPendingRequests
);

/**
 * @swagger
 * /api/role-requests:
 *   get:
 *     tags: [Role Requests]
 *     summary: Search role requests (Admin)
 *     description: Search and filter role requests with advanced criteria
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by request status
 *         example: "PENDING"
 *       - in: query
 *         name: requestedRole
 *         schema:
 *           type: string
 *           enum: [PARTNER, DISTRIBUTOR, AUTHORITY]
 *         description: Filter by requested role
 *         example: "PARTNER"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results
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
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
roleRequestRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  roleRequestController.searchRequests
);

/**
 * @swagger
 * /api/role-requests/{id}/review:
 *   put:
 *     tags: [Role Requests]
 *     summary: Review role request (Admin)
 *     description: Approve or reject a role request. Approving grants the requested role to the user.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role request ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Decision on the request
 *                 example: "approve"
 *               comments:
 *                 type: string
 *                 maxLength: 500
 *                 description: Admin comments on the decision
 *                 example: "Approved based on demonstrated loyalty and business acumen in Small Heath operations."
 *     responses:
 *       200:
 *         description: Role request reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Role request approved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: "APPROVED"
 *                     reviewedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Role request not found
 *       409:
 *         description: Request already reviewed
 */
roleRequestRouter.put(
  '/:id/review',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema(reviewRoleRequestSchema),
  roleRequestController.reviewRequest
);
