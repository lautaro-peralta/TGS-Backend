// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  textSearchSchema,
  dateSearchSchema,
  dniSchema,
  descriptionSchema,
  moneySchema,
  quantitySchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Sale-specific validations
// ============================================================================

/**
 * Schema for sale detail (mandatory field).
 * Must be a non-empty string with meaningful content.
 */
const detailSchema = z
  .string()
  .min(1, { message: 'Detail is required and cannot be empty' })
  .refine((val) => /\S/.test(val), {
    message: 'Detail cannot be only whitespace'
  })
  .transform((val) => val.trim());

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
 * Uses professional validation schemas for enterprise-grade data integrity.
 */
export const createSaleSchema = z.object({
  /**
   * The DNI of the client making the purchase.
   * Must follow official Argentine DNI format.
   * If not provided, uses the authenticated user's DNI.
   */
  clientDni: dniSchema.optional(),

  /**
   * The DNI of the distributor handling the sale.
   * Must follow official Argentine DNI format.
   */
  distributorDni: dniSchema,

  /**
   * The detail/description of the sale.
   * Mandatory field with no length restrictions.
   */
  detail: detailSchema,

  /**
   * An array of sale details with professional validation.
   */
  details: z
    .array(
      z.object({
        /**
         * The ID of the product being purchased.
         * Must be a positive integer.
         */
        productId: z
          .number()
          .int('Product ID must be a whole number')
          .positive('Product ID must be greater than 0'),

        /**
         * The quantity of the product being purchased.
         * Must be a valid quantity with professional limits.
         */
        quantity: quantitySchema
          .min(1, 'Quantity must be at least 1')
          .refine((val) => val <= 1000, {
            message: 'Quantity cannot exceed 1000 units per product'
          }),
      })
    )
    .min(1, 'There must be at least one product in the sale')
    .max(50, 'Cannot purchase more than 50 different products in one sale'),

  /**
   * Optional personal information for creating a new client if they don't exist.
   * Uses professional validation schemas when provided.
   */
  person: z
    .object({
      name: z.string().min(1, 'Name is required'),
      email: z.email('Invalid email format'),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .optional()
    .refine(
      (data) => {
        // If person data is provided, validate required fields
        if (data) {
          return data.name && data.email;
        }
        return true;
      },
      {
        message: 'Name and email are required when providing person data',
        path: ['name'],
      }
    ),
});