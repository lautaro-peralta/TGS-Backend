// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { MonthlyReviewController } from './monthlyReview.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createMonthlyReviewSchema,
  updateMonthlyReviewSchema,
} from './monthlyReview.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - MonthlyReview
// ============================================================================
export const monthlyReviewRouter = Router();
const monthlyReviewController = new MonthlyReviewController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES - Monthly Reviews
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/monthly-reviews/search:
 *   get:
 *     tags: [Monthly Reviews]
 *     summary: Search monthly reviews
 *     description: Search monthly business reviews with filters for year, month, status, and partner
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: Filter by year
 *         example: 1920
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Filter by month (1-12)
 *         example: 6
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_REVIEW, COMPLETED, APPROVED, REJECTED]
 *         description: Filter by review status
 *         example: "COMPLETED"
 *       - in: query
 *         name: partnerDni
 *         schema:
 *           type: string
 *         description: Filter by partner DNI
 *         example: "23456789"
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
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Partner or Admin role required
 */
monthlyReviewRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  monthlyReviewController.searchMonthlyReviews
);

/**
 * @swagger
 * /api/monthly-reviews/statistics:
 *   get:
 *     tags: [Monthly Reviews]
 *     summary: Get sales statistics
 *     description: Retrieves sales statistics for dashboard graphs and analysis
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: Year for statistics
 *         example: 1920
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Optional month (if not provided, returns yearly stats)
 *         example: 6
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [distributor, product, client, day, zone]
 *         description: Group statistics by category
 *         example: "product"
 *     responses:
 *       200:
 *         description: Sales statistics
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
 *                     totalSales:
 *                       type: number
 *                       example: 125000
 *                     totalRevenue:
 *                       type: number
 *                       example: 500000
 *                     breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Partner or Admin role required
 */
monthlyReviewRouter.get(
  '/statistics',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  monthlyReviewController.getSalesStatistics
);

/**
 * @swagger
 * /api/monthly-reviews:
 *   get:
 *     tags: [Monthly Reviews]
 *     summary: Get all monthly reviews
 *     description: Retrieves a complete list of all monthly business reviews
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all monthly reviews
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
 *                       year:
 *                         type: integer
 *                         example: 1920
 *                       month:
 *                         type: integer
 *                         example: 6
 *                       status:
 *                         type: string
 *                         example: "COMPLETED"
 *                       partner:
 *                         type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Partner or Admin role required
 */
monthlyReviewRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  monthlyReviewController.getAllMonthlyReviews
);

/**
 * @swagger
 * /api/monthly-reviews/{id}:
 *   get:
 *     tags: [Monthly Reviews]
 *     summary: Get monthly review by ID
 *     description: Retrieves detailed information about a specific monthly review
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Monthly review ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Monthly review details
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
 *                     year:
 *                       type: integer
 *                       example: 1920
 *                     month:
 *                       type: integer
 *                       example: 6
 *                     reviewDate:
 *                       type: string
 *                       format: date-time
 *                     partnerDni:
 *                       type: string
 *                     status:
 *                       type: string
 *                     observations:
 *                       type: string
 *                       example: "Strong sales in Small Heath. Expansion opportunities in Camden Town."
 *                     recommendations:
 *                       type: string
 *                       example: "Increase whiskey production. Negotiate new distribution agreements."
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Partner or Admin role required
 *       404:
 *         description: Monthly review not found
 */
monthlyReviewRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  monthlyReviewController.getOneMonthlyReviewById
);

/**
 * @swagger
 * /api/monthly-reviews:
 *   post:
 *     tags: [Monthly Reviews]
 *     summary: Create monthly review
 *     description: Creates a new monthly business review for tracking sales and operations
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - month
 *               - partnerDni
 *             properties:
 *               year:
 *                 type: integer
 *                 minimum: 2000
 *                 maximum: 2100
 *                 example: 1920
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 6
 *               reviewDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optional - Date when review was conducted
 *                 example: "1920-07-01T10:00:00Z"
 *               partnerDni:
 *                 type: string
 *                 description: DNI of the partner conducting the review
 *                 example: "23456789"
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_REVIEW, COMPLETED, APPROVED, REJECTED]
 *                 default: PENDING
 *                 example: "IN_REVIEW"
 *               observations:
 *                 type: string
 *                 example: "Record sales in June. Birmingham operations running smoothly."
 *               recommendations:
 *                 type: string
 *                 example: "Consider expanding to Liverpool docks for import operations."
 *     responses:
 *       201:
 *         description: Monthly review created successfully
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
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Partner or Admin role required
 */
monthlyReviewRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  validateWithSchema({ body: createMonthlyReviewSchema }),
  monthlyReviewController.createMonthlyReview
);

/**
 * @swagger
 * /api/monthly-reviews/{id}:
 *   patch:
 *     tags: [Monthly Reviews]
 *     summary: Update monthly review
 *     description: Partially updates a monthly review's information
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Monthly review ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_REVIEW, COMPLETED, APPROVED, REJECTED]
 *                 example: "APPROVED"
 *               observations:
 *                 type: string
 *                 example: "Updated: Excellent performance across all territories."
 *               recommendations:
 *                 type: string
 *                 example: "Updated: Maintain current strategy and expand workforce."
 *               reviewDate:
 *                 type: string
 *                 format: date-time
 *                 example: "1920-07-02T14:30:00Z"
 *     responses:
 *       200:
 *         description: Monthly review updated successfully
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
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Partner or Admin role required
 *       404:
 *         description: Monthly review not found
 */
monthlyReviewRouter.patch(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  validateWithSchema({ body: updateMonthlyReviewSchema }),
  monthlyReviewController.updateMonthlyReview
);

/**
 * @swagger
 * /api/monthly-reviews/{id}:
 *   delete:
 *     tags: [Monthly Reviews]
 *     summary: Delete monthly review
 *     description: Removes a monthly review from the system (Admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Monthly review ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Monthly review deleted successfully
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
 *                   example: "Monthly review deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Monthly review not found
 */
monthlyReviewRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  monthlyReviewController.deleteMonthlyReview
);
