// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  textSearchSchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Admin Search
// ============================================================================

/**
 * Schema for searching admins.
 */
export const searchAdminsSchema = paginationSchema
  .extend(textSearchSchema.shape)
  .extend({
    by: z.enum(['name', 'department']).optional().default('name'),
  });

// ============================================================================
// SCHEMAS - Admin CRUD
// ============================================================================

/**
 * Zod schema for creating a new admin.
 */
export const createAdminSchema = z.object({
  /**
   * The DNI of the admin.
   */
  dni: z.string().min(1, 'The DNI is required'),
  /**
   * The name of the admin.
   */
  name: z.string().min(1, 'The name is required'),
  /**
   * The email of the admin.
   */
  email: z.string().email('Invalid email format'),
  /**
   * The phone of the admin.
   */
  phone: z.string().optional(),
  /**
   * The address of the admin.
   */
  address: z.string().optional(),
  /**
   * Administrative rank.
   */
  rank: z.number().int().positive().optional(),
  /**
   * Department or area of responsibility.
   */
  department: z.string().optional(),
});

/**
 * Zod schema for updating an admin.
 */
export const updateAdminSchema = createAdminSchema.partial().omit({ dni: true });
