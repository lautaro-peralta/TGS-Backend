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
  email: z.email('El email debe ser válido'),

  /**
   * User's password.
   * Must be at least 8 characters long and contain at least one uppercase letter,
   * one lowercase letter, one number, and one special character.
   */
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial'
    ),

  /**
   * User's username.
   * Must be between 2 and 100 characters long.
   */
  username: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
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
  email: z.email('Email inválido'),

  /**
   * User's password.
   * Cannot be empty.
   */
  password: z.string().min(1, 'La contraseña es obligatoria'),
});