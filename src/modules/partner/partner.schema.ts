// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  textSearchSchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Partner Search
// ============================================================================

/**
 * Schema for searching partners by name, email or dni.
 */
export const searchPartnersSchema = paginationSchema.merge(textSearchSchema);

// ============================================================================
// SCHEMAS - Partner CRUD
// ============================================================================

/**
 * Zod schema for creating a new partner.
 */
export const createPartnerSchema = z.object({
  /**
   * Partner's DNI.
   */
  dni: z.string().min(1, 'DNI is required'),
  /**
   * Partner's name.
   */
  name: z.string().min(1, 'Name is required'),
  /**
   * Partner's email address.
   */
  email: z.string().email('Invalid email'),
  /**
   * Partner's address.
   */
  address: z.string().optional(),
  /**
   * Partner's phone number.
   */
  phone: z.string().min(6).optional(),
  /**
   * Username for partner account (optional).
   */
  username: z.string().min(3).optional(),
  /**
   * Password for partner account (optional).
   */
  password: z.string().min(6).optional(),
});

/**
 * Zod schema for updating a partner.
 * All fields are optional for partial updates (PATCH).
 */
export const updatePartnerSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email').optional(),
  address: z.string().optional(),
  phone: z.string().min(6).optional(),
});