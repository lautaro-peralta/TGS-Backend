// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Decision
// ============================================================================

const today = new Date();
today.setHours(0, 0, 0, 0);

/**
 * Zod schema for creating a new strategic decision.
 */
export const createDecisionSchema = z
  .object({
    /**
     * The ID of the theme associated with the decision.
     */
    themeId: z.number().int().positive(),
    /**
     * The description of the strategic decision.
     */
    description: z
      .string()
      .min(1, 'Strategic decision description is required'),
    /**
     * The start date of the strategic decision.
     * Must be greater than or equal to today.
     */
    startDate: z.coerce.date().refine((date) => date >= today, {
      message: 'The date must be greater than or equal to today',
    }),
    /**
     * The end date of the strategic decision.
     */
    endDate: z.coerce.date(),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: 'The end date must be greater than or equal to the start date',
      path: ['endDate'],
    }
  );

/**
 * Zod schema for updating a strategic decision.
 * All fields are optional.
 */
export const updateDecisionSchema = createDecisionSchema.partial();