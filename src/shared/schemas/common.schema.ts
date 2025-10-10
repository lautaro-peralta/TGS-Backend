import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS - Reusable validation schemas
// ============================================================================

/**
 * Schema for pagination query parameters.
 * Used by all search/list endpoints.
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((val) => val >= 1, { message: 'Page must be at least 1' }),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform(Number)
    .refine((val) => val >= 1 && val <= 100, {
      message: 'Limit must be between 1 and 100'
    }),
});

/**
 * Schema for text search query parameter.
 * Validates minimum length of 2 characters.
 */
export const textSearchSchema = z.object({
  q: z
    .string()
    .min(2, { message: 'Search query must be at least 2 characters long' })
    .optional(),
});

/**
 * Schema for boolean query parameters.
 * Accepts 'true' or 'false' as strings.
 */
export const booleanQuerySchema = (fieldName: string = 'value') =>
  z.enum(['true', 'false'], {
    message: `${fieldName} must be "true" or "false"`,
  });

/**
 * Schema for numeric range query parameters.
 * Used for price, amount, rank, etc.
 */
export const numericRangeSchema = z.object({
  min: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => val === undefined || !isNaN(val), {
      message: 'Minimum value must be a valid number',
    }),
  max: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => val === undefined || !isNaN(val), {
      message: 'Maximum value must be a valid number',
    }),
}).refine(
  (data) => {
    if (data.min !== undefined && data.max !== undefined) {
      return data.min <= data.max;
    }
    return true;
  },
  { message: 'Minimum value cannot be greater than maximum value' }
);

/**
 * Schema for date search query parameters.
 * Supports exact, before, after, and between date searches.
 */
export const dateSearchSchema = z
  .object({
    date: z
      .string()
      .optional()
      .refine(
        (val) => !val || !isNaN(new Date(val).getTime()),
        { message: 'Date must be a valid ISO 8601 date' }
      ),
    type: z
      .enum(['exact', 'before', 'after', 'between'], {
        message: 'Type must be "exact", "before", "after", or "between"',
      })
      .optional(),
    endDate: z
      .string()
      .optional()
      .refine(
        (val) => !val || !isNaN(new Date(val).getTime()),
        { message: 'End date must be a valid ISO 8601 date' }
      ),
  })
  .refine(
    (data) => {
      // If date is provided, type must be provided
      if (data.date && !data.type) {
        return false;
      }
      return true;
    },
    {
      message: 'Type parameter is required when filtering by date',
      path: ['type'],
    }
  )
  .refine(
    (data) => {
      // If type is 'between', endDate must be provided
      if (data.type === 'between' && !data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: 'End date is required when type is "between"',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      // If both dates are provided, endDate must be >= date
      if (data.date && data.endDate) {
        return new Date(data.endDate) >= new Date(data.date);
      }
      return true;
    },
    {
      message: 'End date must be greater than or equal to start date',
      path: ['endDate'],
    }
  );

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type PaginationQuery = z.infer<typeof paginationSchema>;
export type TextSearchQuery = z.infer<typeof textSearchSchema>;
export type NumericRangeQuery = z.infer<typeof numericRangeSchema>;
export type DateSearchQuery = z.infer<typeof dateSearchSchema>;
