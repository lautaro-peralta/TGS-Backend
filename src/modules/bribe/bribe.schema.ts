// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  dateSearchSchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Bribe Search
// ============================================================================

/**
 * Schema for searching bribes with multiple criteria.
 */
export const searchBribesSchema = paginationSchema
  .merge(dateSearchSchema)
  .extend({
    paid: z.enum(['true', 'false']).optional(),
  });

// ============================================================================
// SCHEMAS - Bribe CRUD
// ============================================================================

/**
 * Zod schema for updating a bribe.
 */
export const updateBribeSchema = z.object({
  /**
   * The total amount of the bribe.
   * Must be a positive number.
   */
  totalAmount: z
    .number()
    .positive({ message: 'The total amount must be positive' }),
});

/**
 * Zod schema for paying bribes.
 */
export const payBribesSchema = z.object({
  /**
   * A single bribe ID or an array of bribe IDs to be paid.
   */
  ids: z.union([
    z.number().int().positive(),
    z.array(z.number().int().positive()).min(1),
  ]),
});

/**
 * Zod schema for making a payment to a bribe.
 */
export const payBribeAmountSchema = z.object({
  /**
   * The amount to pay.
   * Must be a positive number.
   */
  amount: z
    .number()
    .positive({ message: 'The payment amount must be positive' }),
});

// ============================================================================
// TYPES - Bribe
// ============================================================================

/**
 * Type definition for the update bribe input.
 */
export type UpdateBribeInput = z.infer<typeof updateBribeSchema>;

/**
 * Type definition for the pay bribe input.
 */
export type payBribeInput = z.infer<typeof payBribesSchema>;

/**
 * Type definition for the pay bribe amount input.
 */
export type PayBribeAmountInput = z.infer<typeof payBribeAmountSchema>;