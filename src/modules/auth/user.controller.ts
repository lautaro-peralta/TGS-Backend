// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import { validate as isUuid } from 'uuid';
import { wrap } from '@mikro-orm/core';
import argon2 from 'argon2';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { User, Role } from './user.entity.js';
import { orm } from '../../shared/db/orm.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

// ============================================================================
// USER CONTROLLER
// ============================================================================

/**
 * Handles user management operations
 *
 * Features:
 * - User profile retrieval (authenticated users)
 * - User listing (admin only)
 * - User search by ID or username
 * - Role management (admin only)
 * - User creation with person association
 */
export class UserController {
  // ──────────────────────────────────────────────────────────────────────────
  // PROFILE OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves authenticated user's profile
   *
   * Process:
   * 1. Extracts user ID from JWT token (set by authMiddleware)
   * 2. Fetches user from database
   * 3. Returns user DTO (sanitized data)
   *
   * @param req - Express request with user data from authMiddleware
   * @param res - Express response
   * @returns 200 with user profile or 404 if not found
   *
   * @example
   * GET /api/users/profile
   * Headers: Cookie: access_token=<jwt>
   */
  async getUserProfile(req: Request, res: Response) {
    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract authenticated user ID
      // ────────────────────────────────────────────────────────────────────
      const { id } = (req as any).user;

      // ────────────────────────────────────────────────────────────────────
      // Fetch user from database
      // ────────────────────────────────────────────────────────────────────
      const em = orm.em.fork();
      const user = await em.findOne(User, { id });

      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Return sanitized user data
      // ────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'User profile obtained successfully',
        user.toDTO()
      );
    } catch (err) {
      console.error('Error getting user:', err);
      return ResponseUtil.internalError(res, 'Error getting user', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // USER LISTING & SEARCH
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all users (Admin only)
   *
   * Returns complete list of users with sanitized data (passwords excluded)
   * Should be used with rolesMiddleware([Role.ADMIN])
   *
   * @param req - Express request
   * @param res - Express response
   * @returns 200 with array of user DTOs
   *
   * @example
   * GET /api/users
   * Requires: ADMIN role
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const em = orm.em.fork();
      const users = await em.find(User, {});

      return ResponseUtil.success(
        res,
        'Users obtained successfully',
        users.map((u) => u.toDTO())
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error getting users', err);
    }
  }

  /**
   * Retrieves a single user by ID or username
   *
   * Process:
   * 1. Checks if identifier is UUID (user ID) or string (username)
   * 2. Searches accordingly
   * 3. Returns user data without password
   *
   * Flexible search allows lookup by either identifier type
   *
   * @param req - Express request with identifier in params
   * @param res - Express response
   * @returns 200 with user data or 404 if not found
   *
   * @example
   * GET /api/users/550e8400-e29b-41d4-a716-446655440000  // By UUID
   * GET /api/users/john_doe  // By username
   */
  async getOneUserById(req: Request, res: Response) {
    const { identifier } = req.params;
    const em = orm.em.fork();

    try {
      let user;

      // ────────────────────────────────────────────────────────────────────
      // Determine search strategy based on identifier format
      // ────────────────────────────────────────────────────────────────────
      if (isUuid(identifier)) {
        // Search by UUID
        user = await em.findOne(User, { id: identifier });
      } else {
        // Search by username
        user = await em.findOne(User, { username: identifier });
      }

      if (!user) {
        return ResponseUtil.notFound(res, 'User', identifier);
      }

      // ────────────────────────────────────────────────────────────────────
      // Remove password from response for security
      // ────────────────────────────────────────────────────────────────────
      const { password, ...safeUser } = wrap(user).toJSON();

      return ResponseUtil.success(res, 'User obtained successfully', safeUser);
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error getting user', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ROLE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates user roles (Admin only)
   *
   * Process:
   * 1. Validates role value against Role enum
   * 2. Fetches target user
   * 3. Adds role if not already present
   * 4. Persists changes
   *
   * Note: Currently only adds roles, does not remove them
   * Should be used with rolesMiddleware([Role.ADMIN])
   *
   * @param req - Express request
   * @param res - Express response
   * @returns 200 with updated user data or appropriate error
   *
   * @example
   * PATCH /api/users/:id/roles
   * Body: { role: "ADMIN" }
   * Requires: ADMIN role
   */
  async updateUserRoles(req: Request, res: Response) {
    try {
      const em = orm.em.fork();

      // ────────────────────────────────────────────────────────────────────
      // Extract validated data from middleware
      // ────────────────────────────────────────────────────────────────────
      const { id } = res.locals.validated.params;
      const { role } = res.locals.validated.body;

      // ────────────────────────────────────────────────────────────────────
      // Validate role against enum
      // ────────────────────────────────────────────────────────────────────
      if (!Object.values(Role).includes(role)) {
        return ResponseUtil.error(res, 'Invalid role', 400);
      }

      // ────────────────────────────────────────────────────────────────────
      // Fetch user
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { id });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Add role if not already present
      // ────────────────────────────────────────────────────────────────────
      if (!user.roles.includes(role)) {
        user.roles.push(role);
        await em.flush();
        return ResponseUtil.success(
          res,
          'Role added successfully',
          user.toDTO()
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Role already exists, return without changes
      // ────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'User updated successfully',
        user.toDTO()
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error updating user', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // USER CREATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new user and associates with existing person
   *
   * Process:
   * 1. Validates person exists and has no user assigned
   * 2. Checks username and email uniqueness
   * 3. Hashes password with Argon2
   * 4. Creates user entity with specified roles
   * 5. Associates user with person (one-to-one relationship)
   *
   * @param req - Express request
   * @param res - Express response
   * @returns 201 with created user data or appropriate error
   *
   * @example
   * POST /api/users
   * Body: {
   *   personId: "uuid",
   *   username: "john_doe",
   *   email: "john@example.com",
   *   password: "secure123",
   *   roles: ["CLIENT"]
   * }
   */
  async createUser(req: Request, res: Response) {
    const em = orm.em.fork();

    // ──────────────────────────────────────────────────────────────────────
    // Extract validated data from middleware
    // ──────────────────────────────────────────────────────────────────────
    const { personId, username, email, password, roles } =
      res.locals.validated.body;

    // ──────────────────────────────────────────────────────────────────────
    // Validate person exists
    // ──────────────────────────────────────────────────────────────────────
    const person = await em.findOne(BasePersonEntity, { id: personId });
    if (!person) return ResponseUtil.notFound(res, 'Person', personId);

    // ──────────────────────────────────────────────────────────────────────
    // Verify person doesn't already have a user (one-to-one constraint)
    // ──────────────────────────────────────────────────────────────────────
    if (person.user)
      return ResponseUtil.conflict(
        res,
        'The person already has a user assigned'
      );

    // ──────────────────────────────────────────────────────────────────────
    // Check username and email uniqueness
    // ──────────────────────────────────────────────────────────────────────
    const usernameExists = await em.findOne(User, { username });
    const emailExists = await em.findOne(User, { email });

    if (usernameExists || emailExists) {
      return ResponseUtil.conflict(
        res,
        'The username or email are already in use'
      );
    }

    // ──────────────────────────────────────────────────────────────────────
    // Hash password securely
    // ──────────────────────────────────────────────────────────────────────
    const hashedPassword = await argon2.hash(password);

    // ──────────────────────────────────────────────────────────────────────
    // Create user entity with person association
    // ──────────────────────────────────────────────────────────────────────
    const user = em.create(User, {
      username,
      email,
      password: hashedPassword,
      roles,
      person,
    });

    // ──────────────────────────────────────────────────────────────────────
    // Persist to database
    // ──────────────────────────────────────────────────────────────────────
    await em.persistAndFlush(user);

    return ResponseUtil.success(res, 'User created successfully', user.toDTO());
  }
}
