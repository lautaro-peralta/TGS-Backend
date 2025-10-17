// ============================================================================
// USER VERIFICATION SCHEMAS - Validación con Zod
// ============================================================================

import { z } from 'zod';
import { emailSchema, paginationSchema } from '../../../shared/schemas/common.schema.js';
import { UserVerificationStatus } from './userVerification.entity.js';

/**
 * Schema para solicitar verificación de usuario
 */
export const requestUserVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para reenviar solicitud de verificación de usuario
 */
export const resendUserVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para validar el token en parámetros
 */
export const verifyTokenParamSchema = z.object({
  token: z
    .string()
    .uuid({ message: 'Invalid token format' })
    .trim(),
});

/**
 * Schema para validar email en parámetros
 */
export const emailParamSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para query params de listado de verificaciones de usuario (admin)
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
 * Schema para rechazar verificación de usuario (body)
 */
export const rejectUserVerificationSchema = z.object({
  reason: z
    .string()
    .min(3, { message: 'Reason must be at least 3 characters long' })
    .max(500, { message: 'Reason cannot exceed 500 characters' })
    .optional(),
});

/**
 * Tipos inferidos de los schemas
 */
export type RequestUserVerificationInput = z.infer<typeof requestUserVerificationSchema>;
export type ResendUserVerificationInput = z.infer<typeof resendUserVerificationSchema>;
export type VerifyTokenParam = z.infer<typeof verifyTokenParamSchema>;
export type EmailParam = z.infer<typeof emailParamSchema>;
export type GetAllUserVerificationsQuery = z.infer<typeof getAllUserVerificationsQuerySchema>;
export type RejectUserVerificationInput = z.infer<typeof rejectUserVerificationSchema>;

