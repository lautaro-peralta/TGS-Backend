// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  dateSearchSchema,
} from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - ConsejoShelby Search
// ============================================================================

/**
 * Schema for searching consejos shelby.
 */
export const searchShelbyCouncilSchema = paginationSchema
  .extend(dateSearchSchema.shape)
  .extend({
    partnerDni: z.string().optional(),
    decisionId: z.coerce.number().int().positive().optional(),
  });

// ============================================================================
// SCHEMAS - ConsejoShelby CRUD
// ============================================================================

/**
 * Zod schema for creating a new consejo shelby.
 */
export const createShelbyCouncilSchema = z.object({
  /**
   * The DNI of the partner.
   */
  partnerDni: z.string().min(1, 'The partner DNI is required'),
  /**
   * The ID of the strategic decision.
   */
  decisionId: z.number().int().positive('The decision ID must be a positive integer'),
  /**
   * Date when the partner joined this council.
   */
  joinDate: z.string().datetime().optional(),
  /**
   * Role or responsibility of the partner.
   */
  role: z.string().optional(),
  /**
   * Additional notes.
   */
  notes: z.string().optional(),
});

/**
 * Zod schema for updating a consejo shelby.
 */
export const updateShelbyCouncilSchema = createShelbyCouncilSchema
  .partial()
  .omit({ partnerDni: true, decisionId: true });
