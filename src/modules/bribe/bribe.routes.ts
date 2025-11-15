// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import { payBribesSchema, payBribeAmountSchema } from './bribe.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { BribeController } from './bribe.controller.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Bribe
// ============================================================================
export const bribeRouter = Router();
const bribeController = new BribeController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/bribes/search:
 *   get:
 *     tags: [Bribes]
 *     summary: Search bribes
 *     description: Search and filter bribes by payment status and date range
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: paid
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by payment status
 *         example: "false"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bribes from this date
 *         example: "1920-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bribes until this date
 *         example: "1920-12-31"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results with pagination
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
 *                         type: integer
 *                         example: 1
 *                       amount:
 *                         type: number
 *                         example: 500
 *                       isPaid:
 *                         type: boolean
 *                         example: false
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       authority:
 *                         type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 */
bribeRouter.get('/search', authMiddleware, rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]), bribeController.searchBribes);

/**
 * @swagger
 * /api/bribes:
 *   get:
 *     tags: [Bribes]
 *     summary: Get all bribes
 *     description: Retrieves a complete list of all bribes in the system
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all bribes
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
 *                         type: integer
 *                         example: 1
 *                       amount:
 *                         type: number
 *                         example: 1000
 *                       isPaid:
 *                         type: boolean
 *                         example: true
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: "1920-05-15T10:30:00Z"
 *                       authority:
 *                         type: object
 *                         properties:
 *                           dni:
 *                             type: string
 *                             example: "12345678"
 *                           name:
 *                             type: string
 *                             example: "Inspector Campbell"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 */
bribeRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]),
  bribeController.getAllBribes
);

/**
 * @swagger
 * /api/bribes/{id}:
 *   get:
 *     tags: [Bribes]
 *     summary: Get bribe by ID
 *     description: Retrieves detailed information about a specific bribe
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bribe ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Bribe details
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
 *                       type: integer
 *                       example: 1
 *                     amount:
 *                       type: number
 *                       example: 750
 *                     isPaid:
 *                       type: boolean
 *                       example: false
 *                     date:
 *                       type: string
 *                       format: date-time
 *                       example: "1920-06-20T14:00:00Z"
 *                     authority:
 *                       type: object
 *                       properties:
 *                         dni:
 *                           type: string
 *                         name:
 *                           type: string
 *                         rank:
 *                           type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Bribe not found
 */
bribeRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]),
  bribeController.getOneBribeById
);

/**
 * @swagger
 * /api/bribes/pay:
 *   patch:
 *     tags: [Bribes]
 *     summary: Mark multiple bribes as paid
 *     description: Updates payment status for multiple bribes at once (Admin/Partner only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 oneOf:
 *                   - type: integer
 *                     example: 5
 *                   - type: array
 *                     items:
 *                       type: integer
 *                     example: [1, 2, 3, 4, 5]
 *                 description: Single bribe ID or array of bribe IDs to mark as paid
 *     responses:
 *       200:
 *         description: Bribes marked as paid successfully
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
 *                   example: "Bribes payment processed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     paid:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: One or more bribes not found
 */
bribeRouter.patch(
  '/pay',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ body: payBribesSchema }),
  bribeController.payBribes
);

/**
 * @swagger
 * /api/bribes/{id}/pay:
 *   patch:
 *     tags: [Bribes]
 *     summary: Mark single bribe as paid
 *     description: Marks a specific bribe as fully paid using its ID from the URL (Admin/Partner only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bribe ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Bribe marked as paid successfully
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
 *                   example: "Bribe paid successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     paid:
 *                       type: boolean
 *                       example: true
 *                     totalAmount:
 *                       type: number
 *                       example: 1000
 *                     paidAmount:
 *                       type: number
 *                       example: 1000
 *                     pendingAmount:
 *                       type: number
 *                       example: 0
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Bribe not found
 */
bribeRouter.patch(
  '/:id/pay',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  bribeController.payBribe
);

/**
 * @swagger
 * /api/bribes/{id}/pay-amount:
 *   patch:
 *     tags: [Bribes]
 *     summary: Make a partial payment to a bribe
 *     description: Allows making a partial payment to a bribe, updating the paid amount (Admin/Partner only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bribe ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to pay (must not exceed pending amount)
 *                 example: 250
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
 *                   example: "Payment processed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     totalAmount:
 *                       type: number
 *                       example: 1000
 *                     paidAmount:
 *                       type: number
 *                       example: 250
 *                     pendingAmount:
 *                       type: number
 *                       example: 750
 *                     paid:
 *                       type: boolean
 *                       example: false
 *                     paymentMade:
 *                       type: number
 *                       example: 250
 *       400:
 *         description: Invalid request or payment exceeds pending amount
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Bribe not found
 */
bribeRouter.patch(
  '/:id/pay-amount',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ body: payBribeAmountSchema }),
  bribeController.payBribeAmount
);

/**
 * @swagger
 * /api/bribes/{id}:
 *   delete:
 *     tags: [Bribes]
 *     summary: Delete bribe
 *     description: Removes a bribe record from the system (Admin/Partner only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bribe ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Bribe deleted successfully
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
 *                   example: "Bribe deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Bribe not found
 */
bribeRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  bribeController.deleteBribe
);
