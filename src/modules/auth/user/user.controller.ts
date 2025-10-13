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
import { orm } from '../../../shared/db/orm.js';
import { BasePersonEntity } from '../../../shared/base.person.entity.js';
import { ResponseUtil } from '../../../shared/utils/response.util.js';
import logger from '../../../shared/utils/logger.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates that roles are compatible.
 * AUTHORITY role is incompatible with PARTNER, DISTRIBUTOR, and ADMIN.
 *
 * @param roles - Array of roles to validate
 * @returns Error message if roles are incompatible, null otherwise
 */
function validateRoleCompatibility(roles: Role[]): string | null {
  const hasAuthority = roles.includes(Role.AUTHORITY);
  const hasPartner = roles.includes(Role.PARTNER);
  const hasDistributor = roles.includes(Role.DISTRIBUTOR);
  const hasAdmin = roles.includes(Role.ADMIN);

  if (hasAuthority && (hasPartner || hasDistributor || hasAdmin)) {
    const incompatibleRoles = [];
    if (hasPartner) incompatibleRoles.push('PARTNER');
    if (hasDistributor) incompatibleRoles.push('DISTRIBUTOR');
    if (hasAdmin) incompatibleRoles.push('ADMIN');

    return `AUTHORITY role is incompatible with: ${incompatibleRoles.join(', ')}`;
  }

  return null;
}

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
   * 2. Fetches user from database with person data
   * 3. Recalculates profile completeness based on current data
   * 4. Returns user DTO (sanitized data)
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
      // Fetch user from database with person data
      // ────────────────────────────────────────────────────────────────────
      const em = orm.em.fork();
      const user = await em.findOne(User, { id }, { populate: ['person'] });

      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Recalculate and update profile completeness
      // ────────────────────────────────────────────────────────────────────
      user.updateProfileCompleteness();
      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // Return sanitized user data
      // ────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'User profile obtained successfully',
        user.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error getting user');
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
   * 3. Validates role compatibility
   * 4. Adds role if not already present
   * 5. Persists changes
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
      // Fetch user with person data
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { id }, { populate: ['person'] });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Validate role compatibility
      // ────────────────────────────────────────────────────────────────────
      if (!user.roles.includes(role)) {
        const newRoles = [...user.roles, role];
        const validationError = validateRoleCompatibility(newRoles);
        if (validationError) {
          return ResponseUtil.validationError(res, validationError, [
            { field: 'role', message: validationError }
          ]);
        }

        // ──────────────────────────────────────────────────────────────────
        // ADMIN role requires complete personal information
        // ──────────────────────────────────────────────────────────────────
        if (role === Role.ADMIN && !user.hasPersonalInfo) {
          return ResponseUtil.validationError(
            res,
            'User must complete personal information before being promoted to ADMIN',
            [
              {
                field: 'role',
                message: 'Complete personal data (DNI, name, phone, address) is required for ADMIN role'
              }
            ]
          );
        }

        // ──────────────────────────────────────────────────────────────────
        // Add role
        // ──────────────────────────────────────────────────────────────────
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
    const user = new User(
      username,
      email,
      hashedPassword,
      roles
    );
    user.person = person as any;

    // ──────────────────────────────────────────────────────────────────────
    // Persist to database
    // ──────────────────────────────────────────────────────────────────────
    await em.persistAndFlush(user);

    return ResponseUtil.success(res, 'User created successfully', user.toDTO());
  }

  // ──────────────────────────────────────────────────────────────────────────
  // USER UPDATE (ADMIN)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates user properties (Admin only)
   *
   * Process:
   * 1. Validates user exists
   * 2. Validates role compatibility if roles are being updated
   * 3. Updates allowed properties: isVerified, emailValidated, isActive, roles
   * 4. Persists changes to database
   * 5. Returns updated user data
   *
   * @param req - Express request with user ID in params
   * @param res - Express response
   * @returns 200 with updated user data
   *
   * @example
   * PUT /api/users/:id
   * Body: { isVerified: true, isActive: false }
   * Requires: ADMIN role
   */
  async updateUser(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract validated data from middleware
      // ────────────────────────────────────────────────────────────────────
      const { id } = res.locals.validated.params;
      const updates = res.locals.validated.body;

      // ────────────────────────────────────────────────────────────────────
      // Fetch user
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { id });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Validate role compatibility if roles are being updated
      // ────────────────────────────────────────────────────────────────────
      if (updates.roles !== undefined) {
        const validationError = validateRoleCompatibility(updates.roles);
        if (validationError) {
          return ResponseUtil.validationError(res, validationError, [
            { field: 'roles', message: validationError }
          ]);
        }

        // ──────────────────────────────────────────────────────────────────
        // ADMIN role requires complete personal information
        // ──────────────────────────────────────────────────────────────────
        if (updates.roles.includes(Role.ADMIN) && !user.hasPersonalInfo) {
          return ResponseUtil.validationError(
            res,
            'User must complete personal information before being promoted to ADMIN',
            [
              {
                field: 'roles',
                message: 'Complete personal data (DNI, name, phone, address) is required for ADMIN role'
              }
            ]
          );
        }
      }

      // ────────────────────────────────────────────────────────────────────
      // Update allowed properties
      // ────────────────────────────────────────────────────────────────────
      if (updates.isVerified !== undefined) {
        user.isVerified = updates.isVerified;
      }
      if (updates.emailValidated !== undefined) {
        user.emailValidated = updates.emailValidated;
      }
      if (updates.isActive !== undefined) {
        user.isActive = updates.isActive;
      }
      if (updates.roles !== undefined) {
        user.roles = updates.roles;
      }

      // ────────────────────────────────────────────────────────────────────
      // Persist changes
      // ────────────────────────────────────────────────────────────────────
      await em.flush();

      return ResponseUtil.updated(
        res,
        'User updated successfully',
        user.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error updating user');
      return ResponseUtil.internalError(res, 'Error updating user', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROFILE COMPLETION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Completes user profile with personal information
   *
   * Process:
   * 1. Validates user is authenticated
   * 2. Checks if profile is already complete
   * 3. Creates or updates BasePersonEntity with provided data
   * 4. Associates person with user
   * 5. Updates profile completeness percentage
   * 6. Returns updated user profile
   *
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @returns 200 with updated user profile
   *
   * @example
   * PUT /api/users/me/complete-profile
   * Body: { dni: "12345678", name: "John Doe", phone: "555-1234", address: "123 Main St" }
   */
  async completeProfile(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract authenticated user ID
      // ────────────────────────────────────────────────────────────────────
      const { id } = (req as any).user;
      const validatedData = res.locals.validated.body;

      // ────────────────────────────────────────────────────────────────────
      // Fetch user from database
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { id }, { populate: ['person'] });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Check if profile is already complete
      // ────────────────────────────────────────────────────────────────────
      if (user.person) {
        return ResponseUtil.error(
          res,
          'Profile is already complete. Use update endpoint to modify.',
          400
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Check if DNI is already in use
      // ────────────────────────────────────────────────────────────────────
      const existingPerson = await em.findOne(BasePersonEntity, {
        dni: validatedData.dni,
      });

      if (existingPerson) {
        return ResponseUtil.conflict(
          res,
          'DNI is already registered to another person',
          'dni'
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Create person entity
      // ────────────────────────────────────────────────────────────────────
      const person = em.create(BasePersonEntity, {
        dni: validatedData.dni,
        name: validatedData.name,
        email: user.email,
        phone: validatedData.phone,
        address: validatedData.address,
      });

      await em.persistAndFlush(person);

      // ────────────────────────────────────────────────────────────────────
      // Associate person with user
      // ────────────────────────────────────────────────────────────────────
      user.person = person as any;

      // ────────────────────────────────────────────────────────────────────
      // Update profile completeness
      // ────────────────────────────────────────────────────────────────────
      user.updateProfileCompleteness();
      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // Return updated user profile
      // ────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Profile completed successfully',
        user.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error completing profile');
      return ResponseUtil.internalError(res, 'Error completing profile', err);
    }
  }
}
