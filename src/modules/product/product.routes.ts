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
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Product
// ============================================================================
export const productRouter = Router();
const productController = new ProductController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products
 *     description: Retrieves a list of all available products (legal and illegal)
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
 */
productRouter.get('/', productController.getAllProducts);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     tags: [Products]
 *     summary: Search products
 *     description: Search for products by name or other criteria
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Matching products found
 */
productRouter.get('/search', productController.searchProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     description: Retrieves a single product by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
productRouter.get('/:id', productController.getOneProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     description: Adds a new product to the catalog (Admin or Distributor only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - stock
 *               - isLegal
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Whiskey irlandés"
 *               description:
 *                 type: string
 *                 example: "Whiskey de contrabando de la mejor calidad"
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 25.50
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 100
 *               isLegal:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
productRouter.post(
  '/',
  validateWithSchema({ body: createProductSchema }),
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.DISTRIBUTOR]),
  productController.createProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update product
 *     description: Partially updates a product's information (Admin or Distributor only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               isLegal:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
productRouter.patch(
  '/:id',
  validateWithSchema({ body: updateProductSchema }),
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.DISTRIBUTOR]),
  productController.updateProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete product
 *     description: Removes a product from the catalog (Admin or Distributor only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
productRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.DISTRIBUTOR]),
  productController.deleteProduct
);