// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { SaleController } from './sale.controller.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import { createSaleSchema } from './sale.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { Role } from '../auth/user.entity.js';

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
 * @access  Private (Admin only)
 */
saleRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: createSaleSchema }),
  saleController.createSale
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