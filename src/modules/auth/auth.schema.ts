// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema } from '../../shared/schemas/common.schema.js';

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
   * User's username (display name).
   * Professional name validation with proper character set.
   */
  username: nameSchema,
});

/**
 * Zod schema for user login.
 * Uses professional validation schemas for consistent data handling.
 */
export const loginSchema = z.object({
  /**
   * User's email address.
   * Professional email validation for login security.
   */
  email: emailSchema,

  /**
   * User's password.
   * Must be provided and will be validated during authentication.
   */
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});