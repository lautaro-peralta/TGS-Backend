// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Client
// ============================================================================

/**
 * Zod schema for creating a new client.
 */
export const createClientSchema = z.object({
  /**
   * Client's DNI.
   */
  dni: z.string().min(1, 'DNI is required'),
  /**
   * Client's name.
   */
  name: z.string().min(1, 'Name is required'),
  /**
   * Client's email address.
   */
  email: z.email('Invalid email'),
  /**
   * Client's address.
   */
  address: z.string().min(1),
  /**
   * Client's phone number.
   */
  phone: z.string().min(6),
});

/**
 * Zod schema for updating a client.
 * All fields are optional for partial updates (PATCH).
 */
export const updateClientSchema = createClientSchema.partial();