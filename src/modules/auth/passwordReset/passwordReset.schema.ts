import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../../shared/schemas/common.schema.js';

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordWithTokenSchema = z.object({
  token: z.string().uuid({ message: 'Invalid token format' }).trim(),
  newPassword: passwordSchema,
});

export const passwordResetTokenParamSchema = z.object({
  token: z.string().uuid({ message: 'Invalid token format' }).trim(),
});

export const passwordResetEmailParamSchema = z.object({
  email: emailSchema,
});

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type ResetPasswordWithTokenInput = z.infer<
  typeof resetPasswordWithTokenSchema
>;
export type PasswordResetTokenParam = z.infer<
  typeof passwordResetTokenParamSchema
>;
export type PasswordResetEmailParam = z.infer<
  typeof passwordResetEmailParamSchema
>;
