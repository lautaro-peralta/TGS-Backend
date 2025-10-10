// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// SCHEMAS - Auth
// ============================================================================

/**
 * Zod schema for user registration.
 * Defines the validation rules for the registration payload.
 */
export const registerSchema = z.object({
  /**
   * User's email address.
   * Must be a valid email format.
   */
  email: z.email('The email must be valid'),

  /**
   * User's password.
   * Must be at least 8 characters long and contain at least one uppercase letter,
   * one lowercase letter, one number, and one special character.
   */
  password: z
    .string()
    .min(8, 'The password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'The password must contain at least: one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  /**
   * User's username.
   * Must be between 2 and 100 characters long.
   */
  username: z
    .string()
    .min(2, 'The name must be at least 2 characters long')
    .max(100),
});

/**
 * Zod schema for user login.
 * Defines the validation rules for the login payload.
 */
export const loginSchema = z.object({
  /**
   * User's email address.
   * Must be a valid email format.
   */
  email: z.email('Invalid email'),

  /**
   * User's password.
   * Cannot be empty.
   */
  password: z.string().min(1, 'Password is required'),
});