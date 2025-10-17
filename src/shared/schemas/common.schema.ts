import { z } from 'zod';

// ============================================================================
// CONSTANTS - Validation constants for consistency
// ============================================================================

/**
 * Common validation constants used across schemas
 */
export const VALIDATION_CONSTANTS = {
  // Length limits
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 3,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_DETAIL_LENGTH: 10,
  MAX_DETAIL_LENGTH: 1000,

  // Email patterns
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]{6,}$/,

  // DNI patterns (Argentine DNI format)
  DNI_REGEX: /^\d{7,8}$/,
  DNI_LENGTH: { min: 7, max: 8 },

  // Password requirements
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_REQUIREMENTS: {
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
  },

  // Pagination limits
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 10,
  MIN_PAGE: 1,

  // Price/amount limits
  MAX_PRICE: 999999.99,
  MAX_QUANTITY: 999999,

  // File size limits (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

// ============================================================================
// BASE SCHEMAS - Reusable validation schemas
// ============================================================================

/**
 * Schema for pagination query parameters.
 * Used by all search/list endpoints with professional limits.
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num)) throw new Error('Page must be a valid number');
      return num;
    })
    .refine((val) => val >= VALIDATION_CONSTANTS.MIN_PAGE, {
      message: `Page must be at least ${VALIDATION_CONSTANTS.MIN_PAGE}`
    }),
  limit: z
    .string()
    .optional()
    .default(VALIDATION_CONSTANTS.DEFAULT_PAGE_SIZE.toString())
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num)) throw new Error('Limit must be a valid number');
      return num;
    })
    .refine((val) => val >= 1, { message: 'Limit must be at least 1' })
    .refine((val) => val <= VALIDATION_CONSTANTS.MAX_PAGE_SIZE, {
      message: `Limit cannot exceed ${VALIDATION_CONSTANTS.MAX_PAGE_SIZE}`
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => val ? Number(val) : undefined)
    .refine((val) => val === undefined || val >= 0, {
      message: 'Offset must be non-negative'
    }),
});

/**
 * Schema for text search query parameter.
 * Advanced validation with sanitization and length limits.
 */
export const textSearchSchema = z.object({
  q: z
    .string()
    .min(VALIDATION_CONSTANTS.MIN_NAME_LENGTH, {
      message: `Search query must be at least ${VALIDATION_CONSTANTS.MIN_NAME_LENGTH} characters long`
    })
    .max(100, { message: 'Search query cannot exceed 100 characters' })
    .regex(/^[a-zA-Z0-9\s\-_@.]+$/, {
      message: 'Search query contains invalid characters'
    })
    .transform((val) => val?.trim().replace(/\s+/g, ' ')) // Normalize whitespace
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
 * Supports exact, before, after, and between date searches with advanced validation.
 */
export const dateSearchSchema = z
  .object({
    date: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100;
        },
        { message: 'Date must be a valid date between 1900 and 2100' }
      )
      .transform((val) => val ? new Date(val).toISOString().split('T')[0] : undefined),
    type: z
      .enum(['exact', 'before', 'after', 'between'], {
        message: 'Type must be "exact", "before", "after", or "between"',
      })
      .optional(),
    endDate: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100;
        },
        { message: 'End date must be a valid date between 1900 and 2100' }
      )
      .transform((val) => val ? new Date(val).toISOString().split('T')[0] : undefined),
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
  )
  .refine(
    (data) => {
      // Validate date range for 'between' queries (max 1 year apart)
      if (data.type === 'between' && data.date && data.endDate) {
        const startDate = new Date(data.date);
        const endDate = new Date(data.endDate);
        const diffInDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffInDays <= 365;
      }
      return true;
    },
    {
      message: 'Date range for "between" queries cannot exceed 1 year',
      path: ['endDate'],
    }
  );

/**
 * Schema for person names with professional validation.
 */
export const nameSchema = z
  .string()
  .min(VALIDATION_CONSTANTS.MIN_NAME_LENGTH, {
    message: `Name must be at least ${VALIDATION_CONSTANTS.MIN_NAME_LENGTH} characters long`
  })
  .max(VALIDATION_CONSTANTS.MAX_NAME_LENGTH, {
    message: `Name cannot exceed ${VALIDATION_CONSTANTS.MAX_NAME_LENGTH} characters`
  })
  .regex(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-']+$/, {
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
  })
  .transform((val) => val.trim().replace(/\s+/g, ' ')) // Normalize whitespace
  .refine((val) => val.length > 0, { message: 'Name cannot be empty' });

/**
 * Schema for email addresses with professional validation.
 */
export const emailSchema = z
  .string()
  .email({ message: 'Invalid email format' })
  .max(254, { message: 'Email cannot exceed 254 characters' })
  .transform((val) => val.toLowerCase().trim())
  .refine(
    (val) => {
      // Additional validation for common email issues
      const localPart = val.split('@')[0];
      return localPart.length <= 64 && !localPart.startsWith('.') && !localPart.endsWith('.');
    },
    { message: 'Invalid email format' }
  );

/**
 * Schema for phone numbers with flexible international format.
 */
export const phoneSchema = z
  .string()
  .min(6, { message: 'Phone number must be at least 6 characters long' })
  .max(20, { message: 'Phone number cannot exceed 20 characters' })
  .regex(VALIDATION_CONSTANTS.PHONE_REGEX, {
    message: 'Invalid phone number format'
  })
  .transform((val) => val.replace(/[\s\-\(\)]/g, '')) // Remove formatting characters
  .refine((val) => /^\+?[\d]+$/.test(val), {
    message: 'Phone number can only contain digits and optional + prefix'
  });

/**
 * Schema for DNI (Argentine identification number).
 */
export const dniSchema = z
  .string()
  .regex(VALIDATION_CONSTANTS.DNI_REGEX, {
    message: `DNI must be ${VALIDATION_CONSTANTS.DNI_LENGTH.min}-${VALIDATION_CONSTANTS.DNI_LENGTH.max} digits`
  })
  .transform(Number)
  .refine((val) => val > 0, { message: 'DNI must be a positive number' });

/**
 * Schema for strong passwords with professional requirements.
 */
export const passwordSchema = z
  .string()
  .min(VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters long`
  })
  .max(128, { message: 'Password cannot exceed 128 characters' })
  .refine(
    (val) => {
      if (!VALIDATION_CONSTANTS.PASSWORD_REQUIREMENTS.uppercase) return true;
      return /[A-Z]/.test(val);
    },
    { message: 'Password must contain at least one uppercase letter' }
  )
  .refine(
    (val) => {
      if (!VALIDATION_CONSTANTS.PASSWORD_REQUIREMENTS.lowercase) return true;
      return /[a-z]/.test(val);
    },
    { message: 'Password must contain at least one lowercase letter' }
  )
  .refine(
    (val) => {
      if (!VALIDATION_CONSTANTS.PASSWORD_REQUIREMENTS.numbers) return true;
      return /\d/.test(val);
    },
    { message: 'Password must contain at least one number' }
  )
  .refine(
    (val) => {
      if (!VALIDATION_CONSTANTS.PASSWORD_REQUIREMENTS.special) return true;
      return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val);
    },
    { message: 'Password must contain at least one special character' }
  );

/**
 * Schema for monetary values with professional precision.
 */
export const moneySchema = z
  .number()
  .min(0, { message: 'Amount cannot be negative' })
  .max(VALIDATION_CONSTANTS.MAX_PRICE, {
    message: `Amount cannot exceed ${VALIDATION_CONSTANTS.MAX_PRICE}`
  })
  .refine((val) => {
    // Allow up to 2 decimal places
    const decimalPlaces = (val.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  }, { message: 'Amount can have at most 2 decimal places' });

/**
 * Schema for quantities with professional limits.
 */
export const quantitySchema = z
  .number()
  .int({ message: 'Quantity must be a whole number' })
  .min(0, { message: 'Quantity cannot be negative' })
  .max(VALIDATION_CONSTANTS.MAX_QUANTITY, {
    message: `Quantity cannot exceed ${VALIDATION_CONSTANTS.MAX_QUANTITY}`
  });

/**
 * Schema for descriptions with professional length and content validation.
 */
export const descriptionSchema = z
  .string()
  .min(VALIDATION_CONSTANTS.MIN_DESCRIPTION_LENGTH, {
    message: `Description must be at least ${VALIDATION_CONSTANTS.MIN_DESCRIPTION_LENGTH} characters long`
  })
  .max(VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH, {
    message: `Description cannot exceed ${VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters`
  })
  .refine((val) => /\S/.test(val), {
    message: 'Description cannot be empty or only whitespace'
  })
  .transform((val) => val.trim().replace(/\s+/g, ' '));

/**
 * Schema for detailed text with extended length limits.
 */
export const detailSchema = z
  .string()
  .min(VALIDATION_CONSTANTS.MIN_DETAIL_LENGTH, {
    message: `Detail must be at least ${VALIDATION_CONSTANTS.MIN_DETAIL_LENGTH} characters long`
  })
  .max(VALIDATION_CONSTANTS.MAX_DETAIL_LENGTH, {
    message: `Detail cannot exceed ${VALIDATION_CONSTANTS.MAX_DETAIL_LENGTH} characters`
  })
  .refine((val) => /\S/.test(val), {
    message: 'Detail cannot be empty or only whitespace'
  })
  .transform((val) => val.trim().replace(/\s+/g, ' '));

/**
 * Schema for boolean values that accepts multiple formats.
 */
export const booleanSchema = z
  .union([
    z.boolean(),
    z.string().transform((val) => {
      if (['true', '1', 'yes', 'on'].includes(val.toLowerCase())) return true;
      if (['false', '0', 'no', 'off'].includes(val.toLowerCase())) return false;
      throw new Error('Invalid boolean value');
    }),
  ]);

/**
 * Schema for URL validation.
 */
export const urlSchema = z
  .string()
  .url({ message: 'Invalid URL format' })
  .max(2048, { message: 'URL cannot exceed 2048 characters' })
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        return ['http:', 'https:'].includes(url.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL must use HTTP or HTTPS protocol' }
  );

/**
 * Schema for file size validation (in bytes).
 */
export const fileSizeSchema = z
  .number()
  .min(1, { message: 'File size must be greater than 0' })
  .max(VALIDATION_CONSTANTS.MAX_FILE_SIZE, {
    message: `File size cannot exceed ${VALIDATION_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`
  });

/**
 * Schema for rank validation (1-10 scale).
 */
export const rankSchema = z
  .number()
  .int({ message: 'Rank must be a whole number' })
  .min(1, { message: 'Rank must be at least 1' })
  .max(10, { message: 'Rank cannot exceed 10' });

/**
 * Schema for percentage validation (0-100).
 */
export const percentageSchema = z
  .number()
  .min(0, { message: 'Percentage cannot be negative' })
  .max(100, { message: 'Percentage cannot exceed 100' })
  .refine((val) => {
    // Allow up to 2 decimal places
    const decimalPlaces = (val.toString().split('.')[1] || '').length;
    return decimalPlaces <= 2;
  }, { message: 'Percentage can have at most 2 decimal places' });

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type PaginationQuery = z.infer<typeof paginationSchema>;
export type TextSearchQuery = z.infer<typeof textSearchSchema>;
export type NumericRangeQuery = z.infer<typeof numericRangeSchema>;
export type DateSearchQuery = z.infer<typeof dateSearchSchema>;
export type NameQuery = z.infer<typeof nameSchema>;
export type EmailQuery = z.infer<typeof emailSchema>;
export type PhoneQuery = z.infer<typeof phoneSchema>;
export type DNIQuery = z.infer<typeof dniSchema>;
export type PasswordQuery = z.infer<typeof passwordSchema>;
export type MoneyQuery = z.infer<typeof moneySchema>;
export type QuantityQuery = z.infer<typeof quantitySchema>;
export type DescriptionQuery = z.infer<typeof descriptionSchema>;
export type DetailQuery = z.infer<typeof detailSchema>;
export type BooleanQuery = z.infer<typeof booleanSchema>;
export type URLQuery = z.infer<typeof urlSchema>;
export type RankQuery = z.infer<typeof rankSchema>;
export type PercentageQuery = z.infer<typeof percentageSchema>;
