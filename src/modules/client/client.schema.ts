// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  textSearchSchema,
  nameSchema,
  emailSchema,
  phoneSchema,
  dniSchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Client Search
// ============================================================================

/**
 * Schema for searching clients by name.
 */
export const searchClientsSchema = paginationSchema.merge(textSearchSchema);

// ============================================================================
// SCHEMAS - Client CRUD
// ============================================================================

/**
 * Zod schema for creating a new client.
 * Uses professional validation schemas for data integrity.
 */
export const createClientSchema = z.object({
  /**
   * Client's DNI (Argentine identification number).
   * Must follow the official DNI format.
   */
  dni: dniSchema,

  /**
   * Client's full name.
   * Professional name validation with proper character set.
   */
  name: nameSchema,

  /**
   * Client's email address.
   * Professional email validation with format checks.
   */
  email: emailSchema,

  /**
   * Client's address.
   * Must be a valid address string.
   */
  address: z
    .string()
    .min(5, { message: 'Address must be at least 5 characters long' })
    .max(200, { message: 'Address cannot exceed 200 characters' })
    .refine((val) => /\S/.test(val), {
      message: 'Address cannot be empty or only whitespace'
    })
    .transform((val) => val.trim()),

  /**
   * Client's phone number.
   * Professional phone number validation with international format support.
   */
  phone: phoneSchema,
});

/**
 * Zod schema for updating a client.
 * All fields are optional for partial updates (PATCH).
 */
export const updateClientSchema = createClientSchema.partial();