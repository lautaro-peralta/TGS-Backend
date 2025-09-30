// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Bribe
// ============================================================================

/**
 * Zod schema for updating a bribe.
 */
export const updateBribeSchema = z.object({
  /**
   * The amount of the bribe.
   * Must be a non-negative number.
   */
  amount: z
    .number()
    .nonnegative({ message: 'The amount must be zero or positive' }),
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