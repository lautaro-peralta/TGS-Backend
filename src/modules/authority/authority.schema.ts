// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Authority
// ============================================================================

/**
 * Zod schema for creating a new authority.
 */
export const createAuthoritySchema = z.object({
  /**
   * Authority's DNI.
   */
  dni: z.string().min(1),
  /**
   * Authority's name.
   */
  name: z.string().min(1),
  /**
   * Authority's email address.
   */
  email: z.string().email(),
  /**
   * Authority's address.
   */
  address: z.string().optional(),
  /**
   * Authority's phone number.
   */
  phone: z.string().optional(),
  /**
   * Authority's rank.
   */
  rank: z.enum(['0', '1', '2', '3']).transform(Number),
  /**
   * ID of the zone the authority belongs to.
   */
  zoneId: z.string().transform(Number),
});

/**
 * Zod schema for updating an authority.
 */
export const updateAuthoritySchema = z.object({
  /**
   * Authority's name.
   */
  name: z.string().min(1),
  /**
   * Authority's rank.
   */
  rank: z.enum(['0', '1', '2', '3']).transform(Number),
  /**
   * ID of the zone the authority belongs to.
   */
  zoneId: z.string().transform(Number),
});

/**
 * Zod schema for partially updating an authority.
 * This schema allows any of the fields in updateAuthoritySchema to be present.
 */
export const partialUpdateAuthoritySchema =
  updateAuthoritySchema.partial();

/**
 * Zod schema for paying bribes.
 */
export const payBribesSchema = z.object({
  /**
   * An array of bribe IDs to be paid.
   */
  ids: z.array(z.number().int().positive()).min(1),
});