// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  textSearchSchema,
  numericRangeSchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Product Search
// ============================================================================

/**
 * Schema for searching products with multiple criteria.
 */
export const searchProductsSchema = paginationSchema
  .merge(textSearchSchema)
  .merge(numericRangeSchema)
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
 */
export const createProductSchema = z.object({
  /**
   * The price of the product.
   * Must be a positive number.
   */
  price: z.number().positive('The price must be a positive number'),
  /**
   * The stock quantity of the product.
   * Must be a non-negative integer.
   */
  stock: z.number().int().nonnegative('The stock cannot be negative'),
  /**
   * The description of the product.
   * Must be between 3 and 200 characters long.
   */
  description: z
    .string()
    .trim()
    .min(3, 'The description must be at least 3 characters long')
    .max(200, 'The description cannot exceed 200 characters')
    .refine((v) => /\S/.test(v), 'The description cannot be empty'),
  /**
   * Indicates if the product is illegal.
   * Defaults to false.
   */
  isIllegal: z.boolean().optional().default(false),
});

/**
 * Zod schema for updating a product.
 * All fields are optional for partial updates (PATCH).
 */
export const updateProductSchema = createProductSchema.partial();