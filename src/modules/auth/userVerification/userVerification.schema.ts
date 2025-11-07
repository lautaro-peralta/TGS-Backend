// ============================================================================
// USER VERIFICATION SCHEMAS - Zod validation schemas
// ============================================================================

import { z } from 'zod';
import { emailSchema, paginationSchema } from '../../../shared/schemas/common.schema.js';
import { UserVerificationStatus } from './userVerification.entity.js';

/**
 * Schema for requesting user verification
 */
export const requestUserVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Schema for resending user verification request
 */
export const resendUserVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Schema for validating email in parameters
 */
export const emailParamSchema = z.object({
  email: emailSchema,
});

/**
 * Schema for query params of user verifications list (admin)
 */
export const getAllUserVerificationsQuerySchema = paginationSchema.extend({
  status: z
    .enum([
      UserVerificationStatus.PENDING,
      UserVerificationStatus.VERIFIED,
      UserVerificationStatus.EXPIRED,
      UserVerificationStatus.CANCELLED,
    ], {
      message: `Status must be one of: ${Object.values(UserVerificationStatus).join(', ')}`,
    })
    .optional(),
});

/**
 * Schema for rejecting user verification (body)
 */
export const rejectUserVerificationSchema = z.object({
  reason: z
    .string()
    .min(3, { message: 'Reason must be at least 3 characters long' })
    .max(500, { message: 'Reason cannot exceed 500 characters' })
    .optional(),
});

/**
 * Inferred types from schemas
 */
export type RequestUserVerificationInput = z.infer<typeof requestUserVerificationSchema>;
export type ResendUserVerificationInput = z.infer<typeof resendUserVerificationSchema>;
export type EmailParam = z.infer<typeof emailParamSchema>;
export type GetAllUserVerificationsQuery = z.infer<typeof getAllUserVerificationsQuerySchema>;
export type RejectUserVerificationInput = z.infer<typeof rejectUserVerificationSchema>;

