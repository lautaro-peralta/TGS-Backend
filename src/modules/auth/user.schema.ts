// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from "zod";

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { Role } from "./user.entity.js";

// ============================================================================
// SCHEMAS - User
// ============================================================================

/**
 * Zod schema for username validation.
 */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username cannot be longer than 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Invalid username: only letters, numbers, and underscores are allowed");

/**
 * Zod schema for creating a new user.
 */
export const createUserSchema = z.object({
  /**
   * User's name.
   */
  name: z.string().min(1, "Name is required"),
  /**
   * User's username.
   */
  username: usernameSchema,
  /**
   * User's email address.
   */
  email: z.string().email("Invalid email"),
  /**
   * User's password.
   */
  password: z.string().min(8, "Password is too short"),
  /**
   * User's role.
   */
  role: z.enum(Object.values(Role) as [string, ...string[]]).optional(),
});

/**
 * Zod schema for changing a user's role.
 */
export const changeRoleSchema = {
  /**
   * URL parameters.
   */
  params: z.object({
    /**
     * User's ID. Must be a valid UUID.
     */
    id: z.string().uuid("Invalid ID")
  }),
  /**
   * Request body.
   */
  body: z.object({
    /**
     * The new role for the user.
     */
    role: z.enum(["ADMIN", "CLIENT", "PARTNER", "DISTRIBUTOR", "AUTHORITY"]),
  }),
};

/**
 * Zod schema for identifying a user by an identifier (ID or username).
 */
export const identifierSchema = z.object({
  /**
   * The identifier for the user.
   */
  identifier: z.string().min(1, "Identifier is required"),
});
