// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Product } from './product.entity.js';
import { Detail } from '../sale/detail.entity.js';
import { Distributor } from '../distributor/distributor.entity.js';
import {
  createProductSchema,
  updateProductSchema,
  searchProductsSchema,
} from './product.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { ProductFilters } from '../../shared/types/common.types.js';
import { searchEntityWithPagination, searchEntityWithPaginationCached } from '../../shared/utils/search.util.js';
import { CACHE_TTL } from '../../shared/services/cache.service.js';
import { validateQueryParams, validateBusinessRules } from '../../shared/middleware/validation.middleware.js';

// ============================================================================
// CONTROLLER - Product
// ============================================================================

/**
 * Controller for handling product-related operations.
 * @class ProductController
 */
export class ProductController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search products with multiple criteria.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by description or legal status
   * - by: 'description' | 'legal' (optional, default: 'description') - Search type
   * - min: number (optional) - Minimum price
   * - max: number (optional) - Maximum price
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * Note: If by='legal', q must be 'true' (legal) or 'false' (illegal)
   */
  async searchProducts(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchProductsSchema);
    if (!validated) return; // Validation failed, response already sent

    // Additional business rule validation for product search
    if (validated.by === 'legal' && validated.q) {
      const allowedValues = ['true', 'false'];
      if (!allowedValues.includes(validated.q)) {
        return ResponseUtil.validationError(res, 'Invalid legal status value', [
          { field: 'q', message: 'Legal status must be "true" or "false"' }
        ]);
      }
    }

    return searchEntityWithPaginationCached(req, res, Product, {
      entityName: 'product',
      em,
      searchFields: validated.by === 'legal' ? undefined : 'description',
      buildFilters: () => {
        const { by, min, max, q } = validated;
        const filters: ProductFilters = {};

        // Filter by legal status
        if (by === 'legal' && q) {
          filters.isIllegal = q === 'false';
        }

        // Filter by price range
        if (min !== undefined || max !== undefined) {
          filters.price = {};
          if (min !== undefined) filters.price.$gte = min;
          if (max !== undefined) filters.price.$lte = max;
        }

        // Filter by description
        if (by === 'description' && q) {
          filters.description = `%${q}%`;
        }

        return filters;
      },
      orderBy: { description: 'ASC' } as any,
      useCache: true,
      cacheTtl: CACHE_TTL.PRODUCT_LIST,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new product.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createProduct(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate request body and create product
      // ──────────────────────────────────────────────────────────────────────
      const validatedData = createProductSchema.parse(req.body);

      const productExists = await em.findOne(Product,{description: validatedData.description})

      if(productExists){
        return ResponseUtil.conflict(res,'A product with that description already exists.', 'description')
      }

      const product = em.create(Product,{
        price: validatedData.price,
        stock: validatedData.stock ?? 0,
        description: validatedData.description,
        detail: validatedData.detail ?? '',
        isIllegal: validatedData.isIllegal ?? false
        });

      // ──────────────────────────────────────────────────────────────────────
      // Associate distributors if provided
      // CRITICAL FIX: Add relationship from BOTH sides (owner and inverse)
      // This ensures the many-to-many relationship is properly persisted
      // ──────────────────────────────────────────────────────────────────────
      if (validatedData.distributorsIds && validatedData.distributorsIds.length > 0) {
        const distributors = await em.find(Distributor, {
          dni: { $in: validatedData.distributorsIds }
        });

        if (distributors.length > 0) {
          // Add from both sides to ensure persistence
          for (const dist of distributors) {
            // Add from inverse side (Product)
            product.distributors.add(dist);
            // Add from owning side (Distributor) - CRITICAL for persistence
            dist.products.add(product);
          }
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Persist with explicit flush to ensure transaction commits
      // CRITICAL FIX: Use persistAndFlush with await to ensure DB write completes
      // before function returns (important for serverless environments like Vercel)
      // ──────────────────────────────────────────────────────────────────────
      await em.persistAndFlush(product);

      // ──────────────────────────────────────────────────────────────────────
      // Populate distributors for response
      // Clear and re-fetch from DB to ensure we have the persisted state
      // ──────────────────────────────────────────────────────────────────────
      em.clear();
      const savedProduct = await em.findOne(Product, { id: product.id }, {
        populate: ['distributors', 'distributors.zone']
      });

      if (!savedProduct) {
        throw new Error('Product was not saved correctly to database');
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.created(
        res,
        'Product created successfully',
        savedProduct.toDTO()
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

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all products with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllProducts(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Product, {
      entityName: 'product',
      em,
      buildFilters: () => ({}),
      orderBy: { description: 'ASC' } as any,
      populate: ['distributors', 'distributors.zone'] as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single product by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneProductById(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch product by ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id);
      const product = await em.findOne(Product, { id });
      if (!product) {
        return ResponseUtil.notFound(res, 'Product', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Product found successfully',
        product.toDTO()
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error searching for product', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates an existing product.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async updateProduct(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate request and fetch product
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id);
      const validatedData = updateProductSchema.parse(req.body);

      const product = await em.findOne(Product, { id });
      if (!product) {
        return ResponseUtil.notFound(res, 'Product', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply updates
      // ──────────────────────────────────────────────────────────────────────
      if (validatedData.description !== undefined)
        product.description = validatedData.description;
      if (validatedData.detail !== undefined)  
      product.detail = validatedData.detail;
      if (validatedData.price !== undefined)
        product.price = validatedData.price;
      if (validatedData.stock !== undefined)
        product.stock = validatedData.stock;
      if (validatedData.isIllegal !== undefined)
        product.isIllegal = validatedData.isIllegal;

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
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
        return ResponseUtil.internalError(res, 'Error updating product', err);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a product by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteProduct(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch product and handle related entities
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id);
      const product = await em.findOne(
        Product,
        { id },
        { populate: ['distributors', 'details'] }
      );
      if (!product) {
        return ResponseUtil.notFound(res, 'Product', id);
      }

      if (product.details.isInitialized() && product.details.length > 0) {
        await em.nativeDelete(Detail, { product: id });
      }

      if (
        product.distributors.isInitialized() &&
        product.distributors.length > 0
      ) {
        product.distributors.removeAll();
        await em.flush();
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the product
      // ──────────────────────────────────────────────────────────────────────
      await em.removeAndFlush(product);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(res, 'Product deleted successfully');
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error deleting product', err);
    }
  }
}