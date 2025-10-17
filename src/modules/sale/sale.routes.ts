// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { SaleController } from './sale.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import { createSaleSchema } from './sale.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Sale
// ============================================================================
export const saleRouter = Router();
const saleController = new SaleController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/sales:
 *   get:
 *     tags: [Sales]
 *     summary: Get all sales
 *     description: Retrieves a complete list of all sales (Admin only)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of sales retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
saleRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.getAllSales
);

/**
 * @swagger
 * /api/sales/search:
 *   get:
 *     tags: [Sales]
 *     summary: Search sales
 *     description: Search for sales by different criteria
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Matching sales found
 *       401:
 *         description: Not authenticated
 */
saleRouter.get('/search', saleController.searchSales);

/**
 * @swagger
 * /api/sales/summary:
 *   get:
 *     tags: [Sales]
 *     summary: Get sales summary
 *     description: Get a summary of sales by date for charts and analytics (Admin only)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sales summary retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
saleRouter.get(
  '/summary',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.getSalesSummary
);

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get sale by ID
 *     description: Retrieves a single sale by its ID (Admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Sale found
 *       404:
 *         description: Sale not found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
saleRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.getOneSaleById
);

/**
 * @swagger
 * /api/sales:
 *   post:
 *     tags: [Sales]
 *     summary: Create a new sale
 *     description: Register a new sale transaction (requires authentication and purchase permissions)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientDni
 *               - productId
 *               - quantity
 *             properties:
 *               clientDni:
 *                 type: string
 *                 example: "12345678"
 *               productId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 5
 *               distributorId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Sale created successfully
 *       400:
 *         description: Invalid data or insufficient stock
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Client or product not found
 */
saleRouter.post(
  '/',
  authMiddleware,
  validateWithSchema({ body: createSaleSchema }),
  saleController.createSale
);

/**
 * @swagger
 * /api/sales/{id}:
 *   patch:
 *     tags: [Sales]
 *     summary: Update sale
 *     description: Update a sale (e.g., reassign distributor) - Admin only
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               distributorId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Sale updated successfully
 *       404:
 *         description: Sale not found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
saleRouter.patch(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.updateSale
);

/**
 * @swagger
 * /api/sales/{id}:
 *   delete:
 *     tags: [Sales]
 *     summary: Delete sale
 *     description: Removes a sale from the system (Admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     responses:
 *       200:
 *         description: Sale deleted successfully
 *       404:
 *         description: Sale not found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
saleRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.deleteSale
);