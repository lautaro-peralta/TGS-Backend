// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { ProductController } from './product.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
} from './product.schema.js';
import { Role } from '../auth/user.entity.js';

// ============================================================================
// ROUTER - Product
// ============================================================================
export const productRouter = Router();
const productController = new ProductController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/products
 * @desc    Get all products. Supports search via query parameter `q`.
 * @access  Public
 */
productRouter.get('/', productController.getAllProducts);

productRouter.get('/search', productController.searchProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get a single product by ID.
 * @access  Public
 */
productRouter.get('/:id', productController.getOneProductById);

/**
 * @route   POST /api/products
 * @desc    Create a new product.
 * @access  Private (Admin or Distributor only)
 */
productRouter.post(
  '/',
  validateWithSchema({ body: createProductSchema }),
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.DISTRIBUTOR]),
  productController.createProduct
);

/**
 * @route   PATCH /api/products/:id
 * @desc    Partially update a product by ID.
 * @access  Private (Admin or Distributor only)
 */
productRouter.patch(
  '/:id',
  validateWithSchema({ body: updateProductSchema }),
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.DISTRIBUTOR]),
  productController.updateProduct
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product by ID.
 * @access  Private (Admin or Distributor only)
 */
productRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.DISTRIBUTOR]),
  productController.deleteProduct
);