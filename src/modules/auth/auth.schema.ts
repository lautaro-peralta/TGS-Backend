// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../shared/schemas/common.schema.js';
import { usernameSchema } from './user/user.schema.js';

// ============================================================================
// SCHEMAS - Auth
// ============================================================================

/**
 * Zod schema for user registration.
 * Uses professional validation schemas for enterprise-grade security.
 */
export const registerSchema = z.object({
  /**
   * User's email address.
   * Professional email validation with format and security checks.
   */
  email: emailSchema,

  /**
   * User's password.
   * Enterprise-grade password requirements with professional security standards.
   */
  password: passwordSchema,

  /**
   * User's username.
   * Only allows letters, numbers, and underscores (3-30 characters).
   */
  username: usernameSchema,
});

/**
 * Zod schema for user login.
 * Uses professional validation schemas for consistent data handling.
 * Accepts either email or username for flexible authentication.
 */
export const loginSchema = z.object({
  /**
   * User's email address or username.
   * Accepts either format for flexible login.
   * Note: Field is named 'email' for backward compatibility but accepts both.
   */
  email: z
    .string()
    .min(1, 'Email or username is required')
    .max(255, 'Email or username cannot exceed 255 characters')
    .trim(),

  /**
   * User's password.
   * Must be provided and will be validated during authentication.
   */
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});