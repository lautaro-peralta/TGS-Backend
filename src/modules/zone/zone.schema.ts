// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  textSearchSchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Zone Search
// ============================================================================

/**
 * Schema for searching zones by name or headquarters status.
 */
export const searchZonesSchema = paginationSchema
  .merge(textSearchSchema)
  .extend({
    by: z.enum(['name', 'headquarters']).optional().default('name'),
  })
  .refine(
    (data) => {
      // If searching by headquarters, q must be 'true' or 'false'
      if (data.by === 'headquarters' && data.q) {
        return data.q === 'true' || data.q === 'false';
      }
      return true;
    },
    {
      message: 'Query parameter "q" must be "true" or "false" when searching by headquarters',
      path: ['q'],
    }
  );

// ============================================================================
// SCHEMAS - Zone CRUD
// ============================================================================

/**
 * Zod schema for creating a new zone.
 */
export const createZoneSchema = z.object({
  /**
   * The name of the zone.
   */
  name: z.string().min(1, 'Zone name is required'),
  /**
   * Description of the zone.
   */
  description: z.string().optional(),
  /**
   * Indicates if the zone is a headquarters.
   * Defaults to false.
   */
  isHeadquarters: z.boolean().optional().default(false),
});

/**
 * Zod schema for updating a zone.
 * All fields are optional for partial updates (PATCH).
 */
export const updateZoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required').optional(),
  description: z.string().optional(),
  isHeadquarters: z.boolean().optional(),
});