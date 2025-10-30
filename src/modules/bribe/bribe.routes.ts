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
bribeRouter.get('/search', authMiddleware, rolesMiddleware([Role.ADMIN, Role.PARTNER]), bribeController.searchBribes);

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
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
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
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
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
 *                   example: "5 bribes marked as paid"
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated:
 *                       type: integer
 *                       example: 5
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
 *     description: Updates payment status for a specific bribe (Admin/Partner only)
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
 *               - ids
 *             properties:
 *               ids:
 *                 oneOf:
 *                   - type: integer
 *                   - type: array
 *                     items:
 *                       type: integer
 *                 example: 1
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
 *       400:
 *         description: Invalid request body
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
  validateWithSchema({ body: payBribesSchema }),
  bribeController.payBribes
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
