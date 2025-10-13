// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  textSearchSchema,
  numericRangeSchema,
  descriptionSchema,
  detailSchema,
  moneySchema,
  quantitySchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Product Search
// ============================================================================

/**
 * Schema for searching products with multiple criteria.
 */
export const searchProductsSchema = paginationSchema
  .extend(textSearchSchema.shape)
  .extend(numericRangeSchema.shape)
  .extend({
    by: z.enum(['description', 'legal']).optional().default('description'),
  })
  .refine(
    (data) => {
      // If searching by legal status, q must be 'true' or 'false'
      if (data.by === 'legal' && data.q) {
        return data.q === 'true' || data.q === 'false';
      }
      return true;
    },
    {
      message: 'Query parameter "q" must be "true" or "false" when searching by legal status',
      path: ['q'],
    }
  );

// ============================================================================
// SCHEMAS - Product CRUD
// ============================================================================

/**
 * Zod schema for creating a new product.
 * Uses professional validation schemas for consistency.
 */
export const createProductSchema = z.object({
  /**
   * The price of the product.
   * Must be a valid monetary amount.
   */
  price: moneySchema,

  /**
   * The stock quantity of the product.
   * Must be a valid quantity.
   */
  stock: quantitySchema,

  /**
   * The description of the product.
   * Professional description validation.
   */
  description: descriptionSchema,

  /**
   * The detailed description of the product.
   * Extended text with professional validation.
   */
  detail: detailSchema,

  /**
   * Indicates if the product is illegal.
   * Boolean validation with flexible input formats.
   */
  isIllegal: z.boolean(),
});

/**
 * Zod schema for updating a product.
 * All fields are optional for partial updates (PATCH).
 */
export const updateProductSchema = createProductSchema.partial();