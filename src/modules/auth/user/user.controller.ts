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
 * Validates that roles are compatible according to business rules.
 *
 * Business Rules:
 * 1. PARTNER can be combined with DISTRIBUTOR or ADMIN, but NOT with AUTHORITY
 * 2. DISTRIBUTOR can be combined with PARTNER or ADMIN, but NOT with AUTHORITY
 * 3. AUTHORITY cannot be combined with PARTNER, DISTRIBUTOR, or ADMIN
 * 4. ADMIN when assigned alone, removes all other roles (handled separately)
 *
 * @param roles - Array of roles to validate
 * @returns Error message if roles are incompatible, null otherwise
 */
function validateRoleCompatibility(roles: Role[]): string | null {
  const hasAuthority = roles.includes(Role.AUTHORITY);
  const hasPartner = roles.includes(Role.PARTNER);
  const hasDistributor = roles.includes(Role.DISTRIBUTOR);
  const hasAdmin = roles.includes(Role.ADMIN);

  // Rule 1: AUTHORITY is incompatible with PARTNER, DISTRIBUTOR, and ADMIN
  if (hasAuthority && (hasPartner || hasDistributor || hasAdmin)) {
    const incompatibleRoles = [];
    if (hasPartner) incompatibleRoles.push('PARTNER');
    if (hasDistributor) incompatibleRoles.push('DISTRIBUTOR');
    if (hasAdmin) incompatibleRoles.push('ADMIN');

    return `AUTHORITY role is incompatible with: ${incompatibleRoles.join(', ')}. AUTHORITY cannot be combined with business roles.`;
  }

  // Rule 2: PARTNER cannot be combined with AUTHORITY (already covered above)
  // Rule 3: DISTRIBUTOR cannot be combined with AUTHORITY (already covered above)

  return null;
}

/**
 * Processes role assignment with special rules.
 * - If ADMIN is being assigned, it clears all other roles and keeps only ADMIN
 * - Otherwise, validates role compatibility
 *
 * @param newRoles - Array of roles being assigned
 * @returns Processed roles array (may be modified if ADMIN is assigned)
 */
function processRoleAssignment(newRoles: Role[]): Role[] {
  const hasAdmin = newRoles.includes(Role.ADMIN);

  // Special rule: If ADMIN is being assigned, remove all other roles
  if (hasAdmin) {
    logger.info('ADMIN role detected in assignment - clearing all other roles');
    return [Role.ADMIN, Role.USER]; // Keep only ADMIN and USER (base role)
  }

  return newRoles;
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
      
      const users = await em.find(User, {}, { populate: ['person'] });

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
   * Retrieves all verified users eligible for role conversion (Admin only)
   *
   * Returns users that meet ALL criteria:
   * - isVerified = true (verified by admin)
   * - profileCompleteness = 100 (complete personal data)
   * - hasPersonalInfo = true (all person fields filled)
   *
   * Optional filtering by target role to ensure role compatibility:
   * - If targetRole=AUTHORITY: excludes users with PARTNER, DISTRIBUTOR, ADMIN, or AUTHORITY roles
   * - If targetRole=PARTNER: excludes users with AUTHORITY role or users who already are PARTNER
   * - If targetRole=DISTRIBUTOR: excludes users with AUTHORITY role or users who already are DISTRIBUTOR
   *
   * @param req - Express request with optional targetRole query param
   * @param res - Express response
   * @returns 200 with array of verified user DTOs
   *
   * @example
   * GET /api/users/verified?targetRole=AUTHORITY
   * GET /api/users/verified?targetRole=PARTNER
   * GET /api/users/verified?targetRole=DISTRIBUTOR
   * Requires: ADMIN or PARTNER role
   */
  async getVerifiedUsers(req: Request, res: Response) {
    try {
      const em = orm.em.fork();
      const { targetRole } = req.query;

      // ────────────────────────────────────────────────────────────────────
      // Fetch verified users with complete profiles
      // ────────────────────────────────────────────────────────────────────
      const users = await em.find(
        User,
        {
          isVerified: true,
          profileCompleteness: 100,
        },
        { populate: ['person'] }
      );

      // ────────────────────────────────────────────────────────────────────
      // Filter users with complete personal information
      // ────────────────────────────────────────────────────────────────────
      let eligibleUsers = users.filter((u) => u.hasPersonalInfo);

      // ────────────────────────────────────────────────────────────────────
      // Filter by role compatibility if targetRole is provided
      // ────────────────────────────────────────────────────────────────────
      if (targetRole) {
        const target = String(targetRole).toUpperCase();

        eligibleUsers = eligibleUsers.filter((user) => {
          const currentRoles = user.roles;

          if (target === 'ADMIN') {
            // For ADMIN role, exclude users who already have ADMIN role
            return !currentRoles.includes(Role.ADMIN);
          }

          if (target === 'AUTHORITY') {
            // AUTHORITY is incompatible with PARTNER, DISTRIBUTOR, ADMIN
            // Also exclude users who already have AUTHORITY role
            const hasIncompatible =
              currentRoles.includes(Role.PARTNER) ||
              currentRoles.includes(Role.DISTRIBUTOR) ||
              currentRoles.includes(Role.ADMIN) ||
              currentRoles.includes(Role.AUTHORITY);
            return !hasIncompatible;
          }

          if (target === 'PARTNER') {
            // PARTNER is incompatible with AUTHORITY
            // Also exclude users who already have PARTNER role
            return !currentRoles.includes(Role.AUTHORITY) &&
                   !currentRoles.includes(Role.PARTNER);
          }

          if (target === 'DISTRIBUTOR') {
            // DISTRIBUTOR is incompatible with AUTHORITY
            // Also exclude users who already have DISTRIBUTOR role
            return !currentRoles.includes(Role.AUTHORITY) &&
                   !currentRoles.includes(Role.DISTRIBUTOR);
          }

          // For other roles, no filtering needed
          return true;
        });
      } else {
        // ──────────────────────────────────────────────────────────────────
        // DEFAULT: Exclude users who already have ADMIN role
        // This is the default behavior when no targetRole is specified
        // ──────────────────────────────────────────────────────────────────
        eligibleUsers = eligibleUsers.filter((user) =>
          !user.roles.includes(Role.ADMIN)
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Return eligible users
      // ────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Verified users obtained successfully',
        eligibleUsers.map((u) => u.toDTO())
      );
    } catch (err) {
      logger.error({ err }, 'Error getting verified users');
      return ResponseUtil.internalError(res, 'Error getting verified users', err);
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
      // Validate and process role assignment
      // ────────────────────────────────────────────────────────────────────
      if (!user.roles.includes(role)) {
        let newRoles = [...user.roles, role];

        // Process roles (ADMIN assignment clears other roles)
        newRoles = processRoleAssignment(newRoles);

        // Validate role compatibility
        const validationError = validateRoleCompatibility(newRoles);
        if (validationError) {
          return ResponseUtil.validationError(res, validationError, [
            { field: 'role', message: validationError }
          ]);
        }

        // ──────────────────────────────────────────────────────────────────
        // ADMIN role requires complete personal information
        // ──────────────────────────────────────────────────────────────────
        if (newRoles.includes(Role.ADMIN) && !user.hasPersonalInfo) {
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
        // Assign processed roles
        // ──────────────────────────────────────────────────────────────────
        user.roles = newRoles;
        await em.flush();

        const message = role === Role.ADMIN
          ? 'ADMIN role assigned - all other roles have been removed'
          : 'Role added successfully';

        logger.info({ userId: user.id, newRoles, requestedRole: role }, message);

        return ResponseUtil.success(
          res,
          message,
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
   * 3. Updates allowed properties: isVerified, emailVerified, isActive, roles
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
      // Validate and process role assignment if roles are being updated
      // ────────────────────────────────────────────────────────────────────
      if (updates.roles !== undefined) {
        // Process roles (ADMIN assignment clears other roles)
        const processedRoles = processRoleAssignment(updates.roles);

        // Validate role compatibility
        const validationError = validateRoleCompatibility(processedRoles);
        if (validationError) {
          return ResponseUtil.validationError(res, validationError, [
            { field: 'roles', message: validationError }
          ]);
        }

        // ──────────────────────────────────────────────────────────────────
        // ADMIN role requires complete personal information
        // ──────────────────────────────────────────────────────────────────
        if (processedRoles.includes(Role.ADMIN) && !user.hasPersonalInfo) {
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

        // Store processed roles for later assignment
        updates.roles = processedRoles;
      }

      // ────────────────────────────────────────────────────────────────────
      // Update allowed properties
      // ────────────────────────────────────────────────────────────────────
      if (updates.isVerified !== undefined) {
        user.isVerified = updates.isVerified;
      }
      if (updates.emailVerified !== undefined) {
        user.emailVerified = updates.emailVerified;
      }
      if (updates.isActive !== undefined) {
        user.isActive = updates.isActive;
      }
      if (updates.roles !== undefined) {
        user.roles = updates.roles;
        logger.info({ userId: user.id, newRoles: updates.roles }, 'User roles updated');
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

  /**
   * Update personal information (phone, address)
   */
  async updatePersonalInfo(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract authenticated user ID and update data
      // ────────────────────────────────────────────────────────────────────
      const { id } = (req as any).user;
      const { phone, address } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // Validate at least one field is provided
      // ────────────────────────────────────────────────────────────────────
      if (!phone && !address) {
        return ResponseUtil.validationError(res, 'At least one field (phone or address) is required', [
          { field: 'phone', message: 'Phone or address must be provided' },
          { field: 'address', message: 'Phone or address must be provided' }
        ]);
      }

      // ────────────────────────────────────────────────────────────────────
      // Fetch user from database
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { id }, { populate: ['person'] });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Check if user has personal information
      // ────────────────────────────────────────────────────────────────────
      if (!user.person) {
        return ResponseUtil.error(
          res,
          'Profile must be completed first',
          400
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Update person fields
      // ────────────────────────────────────────────────────────────────────
      const personEntity = (user.person as any)?.getEntity
        ? (user.person as any).getEntity()
        : (user.person as any);

      if (phone) {
        personEntity.phone = phone.trim();
      }
      if (address) {
        personEntity.address = address.trim();
      }

      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // Also update related role entities (Distributor, Partner, Authority)
      // since they inherit from BasePersonEntity and have their own copies
      // ────────────────────────────────────────────────────────────────────
      const dni = personEntity.dni;
      if (dni) {
        // Dynamically import role entities to avoid circular dependencies
        const { Distributor } = await import('../../distributor/distributor.entity.js');
        const { Partner } = await import('../../partner/partner.entity.js');
        const { Authority } = await import('../../authority/authority.entity.js');

        const updates: any = {};
        if (phone) updates.phone = phone.trim();
        if (address) updates.address = address.trim();

        // Update Distributor if user has DISTRIBUTOR role
        if (user.roles.includes(Role.DISTRIBUTOR)) {
          const distributor = await em.findOne(Distributor, { dni });
          if (distributor) {
            em.assign(distributor, updates);
            logger.info({ dni }, 'Updated Distributor personal info');
          }
        }

        // Update Partner if user has PARTNER role
        if (user.roles.includes(Role.PARTNER)) {
          const partner = await em.findOne(Partner, { dni });
          if (partner) {
            em.assign(partner, updates);
            logger.info({ dni }, 'Updated Partner personal info');
          }
        }

        // Update Authority if user has AUTHORITY role
        if (user.roles.includes(Role.AUTHORITY)) {
          const authority = await em.findOne(Authority, { dni });
          if (authority) {
            em.assign(authority, updates);
            logger.info({ dni }, 'Updated Authority personal info');
          }
        }

        await em.flush();
      }

      // ────────────────────────────────────────────────────────────────────
      // Refresh user entity to ensure person data is up-to-date
      // ────────────────────────────────────────────────────────────────────
      await em.refresh(user);

      // ────────────────────────────────────────────────────────────────────
      // Return updated user profile
      // ────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Personal information updated successfully',
        user.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error updating personal information');
      return ResponseUtil.internalError(res, 'Error updating personal information', err);
    }
  }
}
