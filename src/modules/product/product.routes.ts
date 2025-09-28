import { Router } from 'express';
import { ProductController } from './product.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  // searchProductSchema, // <- uncomment if you added it in product.schema.ts
} from './product.schema.js';
import { Role } from '../auth/user.entity.js';

export const productRouter = Router();
const productController = new ProductController();

// GET /products  (Option A: supports ?q= for partial search by description)
// If you have already defined searchProductSchema in product.schema.ts, validate the query like this:
// productRouter.get('/', validateWithSchema({ query: searchProductSchema }), productController.getAllProducts);
productRouter.get('/', productController.getAllProducts);

productRouter.get('/:id', productController.getOneProductById);

productRouter.get('/search', productController.getOneProductById);

productRouter.post(
  '/',
  validateWithSchema({ body: createProductSchema }),
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN], Role.DISTRIBUTOR),
  productController.createProduct
);

productRouter.patch(
  '/:id',
  validateWithSchema({ body: updateProductSchema }),
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN, Role.DISTRIBUTOR]),
  productController.updateProduct
);

// DELETE /products/:id  (ADMIN or DISTRIBUTOR)
productRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN], Role.DISTRIBUTOR),
  productController.deleteProduct
);
