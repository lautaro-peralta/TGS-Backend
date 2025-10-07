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
import {
  createProductSchema,
  updateProductSchema,
} from './product.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntity, searchEntityByRange } from '../../shared/utils/search.util.js';

// ============================================================================
// CONTROLLER - Product
// ============================================================================

/**
 * Controller for handling product-related operations.
 * @class ProductController
 */
export class ProductController {
  /**
   * Search products with multiple criteria.
   *
   * Query params:
   * - q: string (min 2 chars) - Búsqueda de texto por descripción (requerido si no viene 'by' o range)
   * - by: 'description' | 'legal' (optional, default: 'description') - Tipo de búsqueda
   * - min: number (opcional) - Precio mínimo (solo cuando by no está presente o viene como 'description')
   * - max: number (opcional) - Precio máximo (solo cuando by no está presente o viene como 'description')
   *
   * Nota: Si viene 'by=legal', busca por legalidad (q='true' para legales, q='false' para ilegales)
   * Nota: Si vienen min/max, se busca por rango de precio
   */
  async searchProducts(req: Request, res: Response) {
    const em = orm.em.fork();

    const { by, min, max, q } = req.query as {
      by?: 'description' | 'legal';
      min?: string;
      max?: string;
      q?: string;
    };

    // Si viene 'by=legal', buscar por legalidad (q=true -> legales, q=false -> ilegales)
    if (by === 'legal') {
      if (q !== 'true' && q !== 'false') {
        return ResponseUtil.validationError(res, 'Validation error', [
          {
            field: 'q',
            message: 'The query parameter "q" must be "true" or "false" when searching by legal status.'
          },
        ]);
      }

      const isIllegal = q === 'false';
      const results = await em.find(Product, { isIllegal });
      const message = ResponseUtil.generateListMessage(
        results.length,
        'product',
        `that are ${q === 'true' ? 'legal' : 'illegal'}`
      );

      return ResponseUtil.successList(res, message, results.map((p) => p.toDTO()));
    }

    // Si vienen parámetros de rango (min o max), buscar por precio
    if (min || max) {
      return searchEntityByRange(req, res, Product, 'price', {
        entityName: 'product',
        em,
        orderBy: { price: 'asc' } as any,
      });
    }

    // Caso por defecto: búsqueda por descripción
    return searchEntity(req, res, Product, 'description', {
      entityName: 'product',
      em,
    });
  }

  /**
   * Retrieves all products.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllProducts(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch all products
      // ──────────────────────────────────────────────────────────────────────
      const products = await em.find(
        Product,
        {},
        {
          orderBy: { description: 'asc' },
        }
      );

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const message = ResponseUtil.generateListMessage(products.length, 'product');

      return ResponseUtil.successList(
        res,
        message,
        products.map((p) => p.toDTO())
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error getting products', err);
    }
  }

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
        stock: validatedData.stock,
        description: validatedData.description,
        isIllegal: validatedData.isIllegal
        });

      await em.persistAndFlush(product);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
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