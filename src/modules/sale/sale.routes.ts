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
 * @route   GET /api/sales
 * @desc    Get all sales.
 * @access  Private (Admin only)
 */
saleRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.getAllSales
);

/**
 * @route   GET /api/sales/search
 * @desc    Search for sales by different criteria.
 * @access  Private (Admin only)
 */
saleRouter.get('/search', saleController.searchSales);

/**
 * @route   GET /api/sales/summary
 * @desc    Get a summary of sales by date for charts.
 * @access  Private (Admin only)
 */
saleRouter.get(
  '/summary',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.getSalesSummary
);



/**
 * @route   GET /api/sales/:id
 * @desc    Get a single sale by ID.
 * @access  Private (Admin only)
 */
saleRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.getOneSaleById
);

/**
 * @route   POST /api/sales
 * @desc    Create a new sale.
 * @access  Private (Authenticated users with purchase permissions)
 */
saleRouter.post(
  '/',
  authMiddleware,
  validateWithSchema({ body: createSaleSchema }),
  saleController.createSale
);

/**
 * @route   PATCH /api/sales/:id
 * @desc    Update a sale (reassign distributor).
 * @access  Private (Admin only)
 */
saleRouter.patch(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.updateSale
);

/**
 * @route   DELETE /api/sales/:id
 * @desc    Delete a sale by ID.
 * @access  Private (Admin only)
 */
saleRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  saleController.deleteSale
);