import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Product } from './product.entity.js';
import { Detail } from '../sale/detail.entity.js';
import {
  createProductSchema,
  updateProductSchema,
} from './product.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const em = orm.em.fork();

export class ProductController {
  async searchProducts(req: Request, res: Response) {
    try {
      const { q } = req.query as { q?: string };

      // Specific validation for search
      if (!q || q.trim().length < 2) {
        return ResponseUtil.validationError(res, 'Validation error', [
          {
            field: 'q',
            message:
              'The query parameter "q" is required and must be at least 2 characters long.',
          },
        ]);
      }

      const where = { description: { $like: `%${q.trim()}%` } };

      const products = await em.find(Product, where, {
        orderBy: { description: 'asc' },
      });

      const message = ResponseUtil.generateListMessage(
        products.length,
        'product',
        `that match "${q}"`
      );

      return ResponseUtil.successList(
        res,
        message,
        products.map((p) => p.toDTO())
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error searching for products', err);
    }
  }

  // Method to list all
  async getAllProducts(req: Request, res: Response) {
    try {
      const products = await em.find(
        Product,
        {},
        {
          orderBy: { description: 'asc' },
        }
      );

      const message = ResponseUtil.generateListMessage(
        products.length,
        'product'
      );

      return ResponseUtil.successList(
        res,
        message,
        products.map((p) => p.toDTO())
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error getting products', err);
    }
  }

  // Get a product by ID
  async getOneProductById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const product = await em.findOne(Product, { id });
      if (!product) {
        return ResponseUtil.notFound(res, 'Product', id);
      }

      return ResponseUtil.success(
        res,
        'Product found successfully',
        product.toDTO()
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error searching for product', err);
    }
  }

  // Create product with Zod validation
  async createProduct(req: Request, res: Response) {
    try {
      const validatedData = createProductSchema.parse(req.body);

      const product = new Product(
        validatedData.price,
        validatedData.stock,
        validatedData.description,
        validatedData.isIllegal
      );

      await em.persistAndFlush(product);

      return ResponseUtil.created(
        res,
        'Product created successfully',
        product.toDTO()
      );
    } catch (err: any) {
      if (err.errors) {
        const validationErrors = err.errors.map((error: any) => ({
          field: error.path?.join('.'),
          message: error.message,
          code: 'VALIDATION_ERROR',
        }));
        return ResponseUtil.validationError(
          res,
          'Validation error',
          validationErrors
        );
      } else {
        return ResponseUtil.internalError(res, 'Error creating product', err);
      }
    }
  }

  // Update product with Zod validation
  async updateProduct(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const validatedData = updateProductSchema.parse(req.body);

      const product = await em.findOne(Product, { id });
      if (!product) {
        return ResponseUtil.notFound(res, 'Product', id);
      }

      // Update only the sent fields
      if (validatedData.description !== undefined)
        product.description = validatedData.description;
      if (validatedData.price !== undefined)
        product.price = validatedData.price;
      if (validatedData.stock !== undefined)
        product.stock = validatedData.stock;
      if (validatedData.isIllegal !== undefined)
        product.isIllegal = validatedData.isIllegal;

      await em.flush();

      return ResponseUtil.updated(
        res,
        'Product updated successfully',
        product.toDTO()
      );
    } catch (err: any) {
      if (err.errors) {
        const validationErrors = err.errors.map((error: any) => ({
          field: error.path?.join('.'),
          message: error.message,
          code: 'VALIDATION_ERROR',
        }));
        return ResponseUtil.validationError(
          res,
          'Validation error',
          validationErrors
        );
      } else {
        return ResponseUtil.internalError(
          res,
          'Error updating product',
          err
        );
      }
    }
  }

  // Delete product
  async deleteProduct(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const product = await em.findOne(
        Product,
        { id },
        { populate: ['distributors', 'details'] }
      );
      if (!product) {
        return ResponseUtil.notFound(res, 'Product', id);
      }

      // If there are details that reference this product, delete them first
      // Alternative: return 409 if there are references and cascade delete is not desired
      if (product.details.isInitialized() && product.details.length > 0) {
        await em.nativeDelete(Detail, { product: id });
      }

      // Clean N:M relationships with distributors
      if (
        product.distributors.isInitialized() &&
        product.distributors.length > 0
      ) {
        product.distributors.removeAll();
        await em.flush();
      }

      await em.removeAndFlush(product);

      return ResponseUtil.deleted(res, 'Product deleted successfully');
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error deleting product', err);
    }
  }
}
