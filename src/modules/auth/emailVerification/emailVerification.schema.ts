// ============================================================================
// EMAIL VERIFICATION SCHEMAS - Validación con Zod
// ============================================================================

import { z } from 'zod';
import { emailSchema, paginationSchema } from '../../../shared/schemas/common.schema.js';
import { EmailVerificationStatus } from './emailVerification.entity.js';

/**
 * Schema para solicitar verificación automática de email
 */
export const requestEmailVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para reenviar email de verificación automática
 */
export const resendEmailVerificationSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para validar el token en parámetros
 */
export const verifyEmailTokenParamSchema = z.object({
  token: z
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
 * Schema para query params de listado de verificaciones de email (admin)
 */
export const getAllEmailVerificationsQuerySchema = paginationSchema.extend({
  status: z
    .enum([
      EmailVerificationStatus.PENDING,
      EmailVerificationStatus.VERIFIED,
      EmailVerificationStatus.EXPIRED,
    ], {
      message: `Status must be one of: ${Object.values(EmailVerificationStatus).join(', ')}`,
    })
    .optional(),
});

/**
 * Tipos inferidos de los schemas
 */
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;
export type ResendEmailVerificationInput = z.infer<typeof resendEmailVerificationSchema>;
export type VerifyEmailTokenParam = z.infer<typeof verifyEmailTokenParamSchema>;
export type EmailParam = z.infer<typeof emailParamSchema>;
export type GetAllEmailVerificationsQuery = z.infer<typeof getAllEmailVerificationsQuerySchema>;

