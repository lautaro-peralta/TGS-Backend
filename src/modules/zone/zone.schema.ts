// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Zone
// ============================================================================

/**
 * Zod schema for creating a new zone.
 */
export const createZoneSchema = z.object({
  /**
   * The name of the zone.
   */
  name: z.string().min(1, 'Nombre de zona requerido'),
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
export const updateZoneSchema = createZoneSchema.partial();