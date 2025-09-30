// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Distributor
// ============================================================================

/**
 * Zod schema for creating a new distributor.
 */
export const createDistributorSchema = z.object({
  /**
   * Distributor's DNI.
   */
  dni: z.string().min(1, 'DNI is required'),
  /**
   * Distributor's name.
   */
  name: z.string().min(1, 'Name is required'),
  /**
   * Distributor's address.
   */
  address: z.string().min(1, 'Address is required'),
  /**
   * Distributor's phone number.
   */
  phone: z.string().min(6, 'Invalid phone'),
  /**
   * Distributor's email address.
   */
  email: z.string().email('Invalid email'),
  /**
   * Optional array of product IDs to associate with the distributor.
   */
  productsIds: z.array(z.number().int().positive()).optional(),
});

/**
 * Zod schema for updating a distributor.
 * All fields are optional for partial updates (PATCH).
 */
export const updateDistributorSchema = z.object({
  /**
   * Distributor's name.
   */
  name: z.string().min(1, 'Name is required').optional(),
  /**
   * Distributor's address.
   */
  address: z.string().min(1, 'Address is required').optional(),
  /**
   * Distributor's phone number.
   */
  phone: z.string().min(6, 'Invalid phone').optional(),
  /**
   * Distributor's email address.
   */
  email: z.email('Invalid email').optional(),
  /**
   * Optional array of product IDs to associate with the distributor.
   */
  productsIds: z.array(z.number().int().positive()).optional(),
});