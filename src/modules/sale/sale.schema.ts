// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  textSearchSchema,
  dateSearchSchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Sale Search
// ============================================================================

/**
 * Schema for searching sales with multiple criteria.
 */
export const searchSalesSchema = paginationSchema
  .merge(textSearchSchema)
  .merge(dateSearchSchema)
  .extend({
    by: z.enum(['client', 'distributor', 'zone']).optional(),
  })
  .refine(
    (data) => {
      // If q is provided, by must also be provided
      if (data.q && !data.by) {
        return false;
      }
      return true;
    },
    {
      message: 'Parameter "by" is required when searching with "q"',
      path: ['by'],
    }
  );

// ============================================================================
// SCHEMAS - Sale CRUD
// ============================================================================

/**
 * Zod schema for creating a new sale.
 */
export const createSaleSchema = z.object({
  /**
   * The DNI of the client making the purchase.
   */
  clientDni: z.string().min(1, "The client's DNI is required"),
  /**
   * The DNI of the distributor handling the sale (required).
   */
  distributorDni: z.string().min(1, "The distributor's DNI is required"),
  /**
   * An array of sale details.
   */
  details: z
    .array(
      z.object({
        /**
         * The ID of the product being purchased.
         */
        productId: z.number().int().positive(),
        /**
         * The quantity of the product being purchased.
         */
        quantity: z.number().positive('The quantity must be greater than 0'),
      })
    )
    .min(1, 'There must be at least one product in the sale'),
  /**
   * Optional personal information for creating a new client if they don't exist.
   */
  person: z
    .object({
      name: z.string().min(1),
      email: z.email(),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});