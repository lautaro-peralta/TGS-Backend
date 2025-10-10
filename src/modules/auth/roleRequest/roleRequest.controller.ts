// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../../shared/db/orm.js';
import { RoleRequest, RequestStatus } from './roleRequest.entity.js';
import { User, Role } from '../user/user.entity.js';
import { ResponseUtil } from '../../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../../shared/utils/search.util.js';
import { validateQueryParams } from '../../../shared/middleware/validation.middleware.js';
import { searchRoleRequestsSchema } from './roleRequest.schema.js';

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
// CONTROLLER - Role Request
// ============================================================================

/**
 * Controller for handling role request operations.
 * @class RoleRequestController
 */
export class RoleRequestController {
  // ──────────────────────────────────────────────────────────────────────────
  // CREATE REQUEST
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new role request.
   * Users can request PARTNER, DISTRIBUTOR, or AUTHORITY roles.
   * Can also request a role change by specifying roleToRemove.
   *
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @returns 201 with created request or appropriate error
   */
  async createRequest(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract authenticated user and validated data
      // ────────────────────────────────────────────────────────────────────
      const { id: userId } = (req as any).user;
      const { requestedRole, roleToRemove, justification } = res.locals.validated.body;

      // ────────────────────────────────────────────────────────────────────
      // Fetch user with person data
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { id: userId }, { populate: ['person'] });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', userId);
      }

      // ────────────────────────────────────────────────────────────────────
      // Handle role change request (swap) vs. regular role request
      // ────────────────────────────────────────────────────────────────────
      const isRoleChange = !!roleToRemove;

      if (isRoleChange) {
        // ──────────────────────────────────────────────────────────────────
        // Validate role change request
        // ──────────────────────────────────────────────────────────────────

        // User must have the role they want to remove
        if (!user.roles.includes(roleToRemove)) {
          return ResponseUtil.error(
            res,
            `You don't have the ${roleToRemove} role to remove`,
            400
          );
        }

        // User shouldn't already have the requested role
        if (user.roles.includes(requestedRole)) {
          return ResponseUtil.error(
            res,
            `You already have the ${requestedRole} role. No need to swap.`,
            400
          );
        }

        // Validate compatibility after the swap
        const rolesAfterSwap = user.roles
          .filter((r) => r !== roleToRemove)
          .concat(requestedRole);

        const compatibilityError = validateRoleCompatibility(rolesAfterSwap);
        if (compatibilityError) {
          return ResponseUtil.validationError(
            res,
            'The requested role change would result in incompatible roles',
            [
              {
                field: 'requestedRole',
                message: compatibilityError
              }
            ]
          );
        }
      } else {
        // ──────────────────────────────────────────────────────────────────
        // Regular role request (no swap)
        // ──────────────────────────────────────────────────────────────────

        // Validate user doesn't already have the role
        if (user.roles.includes(requestedRole)) {
          return ResponseUtil.error(
            res,
            `You already have the ${requestedRole} role`,
            400
          );
        }

        // Validate role compatibility with current roles
        const potentialRoles = [...user.roles, requestedRole];
        const compatibilityError = validateRoleCompatibility(potentialRoles);

        if (compatibilityError) {
          return ResponseUtil.validationError(
            res,
            'This role is incompatible with your current roles',
            [
              {
                field: 'requestedRole',
                message: compatibilityError
              }
            ]
          );
        }
      }

      // ────────────────────────────────────────────────────────────────────
      // Check if user has complete profile (required for special roles)
      // ────────────────────────────────────────────────────────────────────
      if (!user.hasPersonalInfo) {
        return ResponseUtil.validationError(
          res,
          'You must complete your personal information before requesting special roles',
          [
            {
              field: 'profile',
              message: 'Complete your profile (DNI, name, phone, address) first'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Check for existing pending request for same role
      // ────────────────────────────────────────────────────────────────────
      const existingRequest = await em.findOne(RoleRequest, {
        user: userId,
        requestedRole,
        status: RequestStatus.PENDING,
      });

      if (existingRequest) {
        return ResponseUtil.conflict(
          res,
          `You already have a pending request for the ${requestedRole} role`,
          'requestedRole'
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Create role request
      // ────────────────────────────────────────────────────────────────────
      const roleRequest = em.create(RoleRequest, {
        user: user as any,
        requestedRole,
        roleToRemove: roleToRemove || undefined,
        justification,
        status: RequestStatus.PENDING,
        createdAt: new Date(),
      });

      await em.persistAndFlush(roleRequest);

      const message = isRoleChange
        ? `Role change request submitted successfully. You are requesting to change from ${roleToRemove} to ${requestedRole}. An admin will review it soon.`
        : 'Role request submitted successfully. An admin will review it soon.';

      return ResponseUtil.created(
        res,
        message,
        roleRequest.toDTO()
      );
    } catch (err) {
      console.error('Error creating role request:', err);
      return ResponseUtil.internalError(res, 'Error creating role request', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET USER'S REQUESTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Gets all role requests for the authenticated user.
   *
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @returns 200 with user's role requests
   */
  async getMyRequests(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const { id: userId } = (req as any).user;

      const requests = await em.find(
        RoleRequest,
        { user: userId },
        {
          populate: ['reviewedBy'],
          orderBy: { createdAt: 'DESC' },
        }
      );

      return ResponseUtil.success(
        res,
        'Role requests retrieved successfully',
        requests.map((r) => r.toDTO())
      );
    } catch (err) {
      console.error('Error getting user requests:', err);
      return ResponseUtil.internalError(res, 'Error getting requests', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADMIN: SEARCH REQUESTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Searches role requests with filters (Admin only).
   *
   * Query params:
   * - status: RequestStatus - Filter by status
   * - requestedRole: Role - Filter by requested role
   * - userId: string - Filter by user ID
   * - page: number (default: 1)
   * - limit: number (default: 10, max: 100)
   *
   * @param req - Express request
   * @param res - Express response
   * @returns 200 with paginated requests
   */
  async searchRequests(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchRoleRequestsSchema);
    if (!validated) return;

    return searchEntityWithPagination(req, res, RoleRequest, {
      entityName: 'role request',
      em,
      buildFilters: () => {
        const { status, requestedRole, userId } = validated;
        const filters: any = {};

        if (status) filters.status = status;
        if (requestedRole) filters.requestedRole = requestedRole;
        if (userId) filters.user = userId;

        return filters;
      },
      populate: ['user', 'reviewedBy'] as any,
      orderBy: { createdAt: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADMIN: REVIEW REQUEST
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Reviews a role request (approve or reject).
   * If approved, adds the role to the user.
   *
   * @param req - Express request with admin user
   * @param res - Express response
   * @returns 200 with updated request
   */
  async reviewRequest(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract admin user and validated data
      // ────────────────────────────────────────────────────────────────────
      const { id: adminUserId } = (req as any).user;
      const { id: requestId } = res.locals.validated.params;
      const { action, comments } = res.locals.validated.body;

      // ────────────────────────────────────────────────────────────────────
      // Fetch admin user
      // ────────────────────────────────────────────────────────────────────
      const adminUser = await em.findOne(User, { id: adminUserId });
      if (!adminUser) {
        return ResponseUtil.notFound(res, 'Admin user', adminUserId);
      }

      // ────────────────────────────────────────────────────────────────────
      // Fetch role request with user
      // ────────────────────────────────────────────────────────────────────
      const roleRequest = await em.findOne(
        RoleRequest,
        { id: requestId },
        { populate: ['user'] }
      );

      if (!roleRequest) {
        return ResponseUtil.notFound(res, 'Role request', requestId);
      }

      // ────────────────────────────────────────────────────────────────────
      // Validate request is still pending
      // ────────────────────────────────────────────────────────────────────
      if (!roleRequest.isPending()) {
        return ResponseUtil.error(
          res,
          `This request has already been ${roleRequest.status.toLowerCase()}`,
          400
        );
      }

      const requestUser = roleRequest.user as any;

      // ────────────────────────────────────────────────────────────────────
      // Process action
      // ────────────────────────────────────────────────────────────────────
      if (action === 'approve') {
        const isRoleChange = roleRequest.isRoleChangeRequest();

        if (isRoleChange) {
          // ──────────────────────────────────────────────────────────────────
          // Handle role change approval
          // ──────────────────────────────────────────────────────────────────

          // Validate user still has the role to remove
          if (!requestUser.roles.includes(roleRequest.roleToRemove!)) {
            return ResponseUtil.error(
              res,
              `User no longer has the ${roleRequest.roleToRemove} role to remove`,
              400
            );
          }

          // Validate user doesn't already have the requested role
          if (requestUser.roles.includes(roleRequest.requestedRole)) {
            return ResponseUtil.error(
              res,
              `User already has the ${roleRequest.requestedRole} role`,
              400
            );
          }

          // Validate compatibility after swap
          const rolesAfterSwap = requestUser.roles
            .filter((r: Role) => r !== roleRequest.roleToRemove)
            .concat(roleRequest.requestedRole);

          const compatibilityError = validateRoleCompatibility(rolesAfterSwap);
          if (compatibilityError) {
            return ResponseUtil.validationError(
              res,
              'Cannot approve: Role change would result in incompatible roles',
              [
                {
                  field: 'requestedRole',
                  message: compatibilityError
                }
              ]
            );
          }

          // Perform the role swap
          requestUser.roles = requestUser.roles.filter(
            (r: Role) => r !== roleRequest.roleToRemove
          );
          requestUser.roles.push(roleRequest.requestedRole);

          // Approve request
          roleRequest.approve(adminUser, comments);
          await em.flush();

          return ResponseUtil.success(
            res,
            `Role change approved. User role changed from ${roleRequest.roleToRemove} to ${roleRequest.requestedRole}.`,
            roleRequest.toDTO()
          );
        } else {
          // ──────────────────────────────────────────────────────────────────
          // Handle regular role request approval
          // ──────────────────────────────────────────────────────────────────

          // Validate role compatibility before approval
          if (!requestUser.roles.includes(roleRequest.requestedRole)) {
            const potentialRoles = [...requestUser.roles, roleRequest.requestedRole];
            const compatibilityError = validateRoleCompatibility(potentialRoles);

            if (compatibilityError) {
              return ResponseUtil.validationError(
                res,
                'Cannot approve: Role is incompatible with user\'s current roles',
                [
                  {
                    field: 'requestedRole',
                    message: compatibilityError
                  }
                ]
              );
            }
          }

          // Approve request
          roleRequest.approve(adminUser, comments);

          // Add role to user
          if (!requestUser.roles.includes(roleRequest.requestedRole)) {
            requestUser.roles.push(roleRequest.requestedRole);
          }

          await em.flush();

          return ResponseUtil.success(
            res,
            `Role request approved. User has been granted ${roleRequest.requestedRole} role.`,
            roleRequest.toDTO()
          );
        }
      } else {
        // Reject request
        roleRequest.reject(adminUser, comments);
        await em.flush();

        return ResponseUtil.success(
          res,
          'Role request rejected',
          roleRequest.toDTO()
        );
      }
    } catch (err) {
      console.error('Error reviewing role request:', err);
      return ResponseUtil.internalError(res, 'Error reviewing request', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADMIN: GET PENDING REQUESTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Gets all pending role requests (Admin only).
   * This is the admin's inbox/queue.
   *
   * @param req - Express request
   * @param res - Express response
   * @returns 200 with pending requests
   */
  async getPendingRequests(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const pendingRequests = await em.find(
        RoleRequest,
        { status: RequestStatus.PENDING },
        {
          populate: ['user'],
          orderBy: { createdAt: 'ASC' }, // Oldest first
        }
      );

      return ResponseUtil.success(
        res,
        `Found ${pendingRequests.length} pending role request(s)`,
        pendingRequests.map((r) => r.toDTO())
      );
    } catch (err) {
      console.error('Error getting pending requests:', err);
      return ResponseUtil.internalError(res, 'Error getting pending requests', err);
    }
  }
}
