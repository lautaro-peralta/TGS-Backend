// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Sale
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
      /**
       * The name of the person.
       */
      name: z.string().min(1),
      /**
       * The email address of the person.
       */
      email: z.email(),
      /**
       * The phone number of the person.
       */
      phone: z.string().optional(),
      /**
       * The address of the person.
       */
      address: z.string().optional(),
    })
    .optional(),
});