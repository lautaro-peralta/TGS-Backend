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
import logger from '../../../shared/utils/logger.js';
import { searchRoleRequestsSchema } from './roleRequest.schema.js';
import { RoleRequestFilters } from '../../../shared/types/common.types.js';

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
      const { requestedRole, roleToRemove, justification, additionalData } = res.locals.validated.body;

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
        // ✅ SPECIAL CASE: For AUTHORITY, calculate roles after removing ALL incompatible roles
        let rolesAfterSwap: Role[];
        if (requestedRole === Role.AUTHORITY) {
          // AUTHORITY removes ALL business roles (PARTNER, DISTRIBUTOR, ADMIN)
          rolesAfterSwap = user.roles
            .filter((r: Role) => ![Role.PARTNER, Role.DISTRIBUTOR, Role.ADMIN].includes(r))
            .concat(requestedRole);
        } else {
          // Normal role swap - remove only the specified role
          rolesAfterSwap = user.roles
            .filter((r) => r !== roleToRemove)
            .concat(requestedRole);
        }

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

      if (requestedRole === Role.DISTRIBUTOR) {
        if (!additionalData || !additionalData.zoneId || !additionalData.address) {
          logger.error('❌ Missing additionalData for DISTRIBUTOR:', additionalData);
          return ResponseUtil.validationError(
            res,
            'DISTRIBUTOR role requires additional data',
            [
              {
                field: 'additionalData',
                message: 'Must provide zoneId and address for DISTRIBUTOR role'
              }
            ]
          );
        }
        logger.info('✅ DISTRIBUTOR additionalData validated:', additionalData);
      }

      if (requestedRole === Role.AUTHORITY) {
        if (!additionalData || !additionalData.rank || !additionalData.zoneId) {
          logger.error('❌ Missing additionalData for AUTHORITY:', additionalData);
          return ResponseUtil.validationError(
            res,
            'AUTHORITY role requires additional data',
            [
              {
                field: 'additionalData',
                message: 'Must provide rank and zoneId for AUTHORITY role'
              }
            ]
          );
        }
        logger.info('✅ AUTHORITY additionalData validated:', additionalData);
      }

      const roleRequest = em.create(RoleRequest, {
        user: user as any,
        requestedRole,
        roleToRemove: roleToRemove || undefined,
        justification,
        additionalData: additionalData || undefined,
        status: RequestStatus.PENDING,
        createdAt: new Date(),
      });

      console.log('💾 [CREATE REQUEST] Saving with additionalData:', {
        id: roleRequest.id,
        requestedRole: roleRequest.requestedRole,
        additionalData: roleRequest.additionalData
      });

      await em.persistAndFlush(roleRequest);

      console.log('✅ [CREATE REQUEST] Role request saved successfully with ID:', roleRequest.id);

      const message = isRoleChange
        ? `Role change request submitted successfully. You are requesting to change from ${roleToRemove} to ${requestedRole}. An admin will review it soon.`
        : 'Role request submitted successfully. An admin will review it soon.';

      return ResponseUtil.created(
        res,
        message,
        roleRequest.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error creating role request');
      return ResponseUtil.internalError(res, 'Error creating role request', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET USER'S REQUESTS
  // ──────────────────────────────────────────────────────────────────────────

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
      logger.error({ err }, 'Error getting user requests');
      return ResponseUtil.internalError(res, 'Error getting requests', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────
  // ADMIN: SEARCH REQUESTS
  // ──────────────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────

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
        const filters: RoleRequestFilters = {};

        if (status) filters.status = status;
        if (requestedRole) filters.requestedRole = requestedRole;
        if (userId) filters.user = { id: userId };

        return filters;
      },
      populate: ['user', 'reviewedBy'] as any,
      orderBy: { createdAt: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADMIN: REVIEW REQUEST
  // ──────────────────────────────────────────────────────────────────────────

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
        { populate: ['user', 'user.person'] }
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

      if (action === 'approve') {
        const requestedRole = roleRequest.requestedRole;
        const additionalData = roleRequest.additionalData;

        if (requestedRole === Role.DISTRIBUTOR) {
          if (!additionalData?.zoneId || !additionalData?.address) {
            return ResponseUtil.validationError(
              res,
              'Cannot approve: This DISTRIBUTOR request is missing required additional data',
              [
                {
                  field: 'additionalData',
                  message: 'DISTRIBUTOR requests require zoneId and address. Please ask the user to create a new request with complete information.'
                }
              ]
            );
          }
        }

        if (requestedRole === Role.AUTHORITY) {
          if (!additionalData?.rank || !additionalData?.zoneId) {
            return ResponseUtil.validationError(
              res,
              'Cannot approve: This AUTHORITY request is missing required additional data',
              [
                {
                  field: 'additionalData',
                  message: 'AUTHORITY requests require rank and zoneId. Please ask the user to create a new request with complete information.'
                }
              ]
            );
          }
        }
      }

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
          // ✅ SPECIAL CASE: For AUTHORITY, calculate roles after removing ALL incompatible roles
          let rolesAfterSwap: Role[];
          if (roleRequest.requestedRole === Role.AUTHORITY) {
            // AUTHORITY removes ALL business roles (PARTNER, DISTRIBUTOR, ADMIN)
            rolesAfterSwap = requestUser.roles
              .filter((r: Role) => ![Role.PARTNER, Role.DISTRIBUTOR, Role.ADMIN].includes(r))
              .concat(roleRequest.requestedRole);
          } else {
            // Normal role swap - remove only the specified role
            rolesAfterSwap = requestUser.roles
              .filter((r: Role) => r !== roleRequest.roleToRemove)
              .concat(roleRequest.requestedRole);
          }

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
          // ✅ SPECIAL CASE: If requesting AUTHORITY, remove ALL incompatible roles
          if (roleRequest.requestedRole === Role.AUTHORITY) {
            // AUTHORITY is incompatible with PARTNER, DISTRIBUTOR, and ADMIN
            // Remove ALL of them if present
            const rolesToRemove = requestUser.roles.filter(
              (r: Role) => [Role.PARTNER, Role.DISTRIBUTOR, Role.ADMIN].includes(r)
            );

            requestUser.roles = requestUser.roles.filter(
              (r: Role) => ![Role.PARTNER, Role.DISTRIBUTOR, Role.ADMIN].includes(r)
            );
            requestUser.roles.push(roleRequest.requestedRole);

            logger.info(
              `Removed all incompatible roles (PARTNER, DISTRIBUTOR, ADMIN) when approving AUTHORITY for user ${requestUser.id}`
            );

            // 🔥 FIX: Delete role records from database tables
            try {
              for (const roleToRemove of rolesToRemove) {
                await deleteRoleRecordForRoleChange(em, roleToRemove, requestUser.person);
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              logger.error({ err }, 'Error deleting old role records');
              return ResponseUtil.error(
                res,
                `Failed to remove old role records: ${errorMessage}`,
                500
              );
            }
          } else {
            // Normal role swap - remove only the specified role
            requestUser.roles = requestUser.roles.filter(
              (r: Role) => r !== roleRequest.roleToRemove
            );
            requestUser.roles.push(roleRequest.requestedRole);

            // 🔥 FIX: Delete role record from database table
            try {
              await deleteRoleRecordForRoleChange(em, roleRequest.roleToRemove!, requestUser.person);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              logger.error({ err }, 'Error deleting old role record');
              return ResponseUtil.error(
                res,
                `Failed to remove old ${roleRequest.roleToRemove} record: ${errorMessage}`,
                500
              );
            }
          }

          try {
            await createRoleRecordForApproval(em, roleRequest, requestUser);
          } catch (err) {
            const errorMessage = err instanceof Error
              ? err.message
              : 'Unknown error occurred';

            logger.error({ err }, 'Error creating role record');
            return ResponseUtil.error(
              res,
              `Failed to create ${roleRequest.requestedRole} record: ${errorMessage}`,
              500
            );
          }

          roleRequest.approve(adminUser, comments);
          await em.flush();

          return ResponseUtil.success(
            res,
            `Role change approved. User role changed from ${roleRequest.roleToRemove} to ${roleRequest.requestedRole}.`,
            roleRequest.toDTO()
          );
        } else {
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

          try {
            await createRoleRecordForApproval(em, roleRequest, requestUser);
          } catch (err: any) {
            logger.error({ err }, 'Error creating role record');
            return ResponseUtil.error(
              res,
              `Failed to create ${roleRequest.requestedRole} record: ${err.message}`,
              500
            );
          }

          roleRequest.approve(adminUser, comments);

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
        roleRequest.reject(adminUser, comments);
        await em.flush();

        return ResponseUtil.success(
          res,
          'Role request rejected',
          roleRequest.toDTO()
        );
      }
    } catch (err) {
      logger.error({ err }, 'Error reviewing role request');
      return ResponseUtil.internalError(res, 'Error reviewing request', err);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
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
          orderBy: { createdAt: 'ASC' },
        }
      );

      return ResponseUtil.success(
        res,
        `Found ${pendingRequests.length} pending role request(s)`,
        pendingRequests.map((r) => r.toDTO())
      );
    } catch (err) {
      logger.error({ err }, 'Error getting pending requests');
      return ResponseUtil.internalError(res, 'Error getting pending requests', err);
    }
  }
}

// ============================================================================
// ✅ HELPER FUNCTIONS - FUERA DE LA CLASE
// ============================================================================

async function createRoleRecordForApproval(
  em: any,
  roleRequest: RoleRequest,
  user: any
): Promise<void> {
  const requestedRole = roleRequest.requestedRole;
  const additionalData = roleRequest.additionalData;
  const person = user.person;

  if (!person) {
    throw new Error('User must have person data to create role record');
  }

  logger.info(`Creating ${requestedRole} record for user ${user.id}`);

  switch (requestedRole) {
    case Role.PARTNER:
      await createPartnerRecord(em, person);
      break;

    case Role.DISTRIBUTOR:
      if (!additionalData?.zoneId || !additionalData?.address) {
        throw new Error('Missing required data for DISTRIBUTOR: zoneId and address');
      }
      await createDistributorRecord(em, person, additionalData);
      break;

    case Role.AUTHORITY:
      if (!additionalData?.rank || !additionalData?.zoneId) {
        throw new Error('Missing required data for AUTHORITY: rank and zoneId');
      }
      await createAuthorityRecord(em, person, additionalData);
      break;

    default:
      logger.warn(`No record creation logic for role: ${requestedRole}`);
  }
}

async function createPartnerRecord(em: any, person: any): Promise<void> {
  const { Partner } = await import('../../partner/partner.entity.js');

  const existing = await em.findOne(Partner, { dni: person.dni });
  if (existing) {
    logger.info(`Partner with DNI ${person.dni} already exists, skipping creation`);
    return;
  }

  const partner = em.create(Partner, {
    dni: person.dni,
    name: person.name,
    email: person.email,
    phone: person.phone || null,
    address: person.address || null,
  });

  await em.persistAndFlush(partner);
  logger.info(`✅ Partner created successfully with DNI: ${person.dni}`);
}

async function createDistributorRecord(
  em: any,
  person: any,
  additionalData: any
): Promise<void> {
  const { Distributor } = await import('../../distributor/distributor.entity.js');
  const { Zone } = await import('../../zone/zone.entity.js');

  const existing = await em.findOne(Distributor, { dni: person.dni });
  if (existing) {
    logger.info(`Distributor with DNI ${person.dni} already exists, skipping creation`);
    return;
  }

  const zone = await em.findOne(Zone, { id: additionalData.zoneId });
  if (!zone) {
    throw new Error(`Zone with ID ${additionalData.zoneId} not found`);
  }

  const distributor = em.create(Distributor, {
    dni: person.dni,
    name: person.name,
    email: person.email,
    phone: person.phone || '-',
    address: additionalData.address,
    zone: zone,
  });

  if (additionalData.productsIds && additionalData.productsIds.length > 0) {
    const { Product } = await import('../../product/product.entity.js');
    const products = await em.find(Product, { id: { $in: additionalData.productsIds } });
    distributor.products.set(products);
  }

  await em.persistAndFlush(distributor);
  logger.info(`✅ Distributor created successfully with DNI: ${person.dni}`);
}

async function createAuthorityRecord(
  em: any,
  person: any,
  additionalData: any
): Promise<void> {
  const { Authority } = await import('../../authority/authority.entity.js');
  const { Zone } = await import('../../zone/zone.entity.js');

  const existing = await em.findOne(Authority, { dni: person.dni });
  if (existing) {
    logger.info(`Authority with DNI ${person.dni} already exists, skipping creation`);
    return;
  }

  const zone = await em.findOne(Zone, { id: additionalData.zoneId });
  if (!zone) {
    throw new Error(`Zone with ID ${additionalData.zoneId} not found`);
  }

  const authority = em.create(Authority, {
    dni: person.dni,
    name: person.name,
    email: person.email,
    phone: person.phone || null,
    address: person.address || null,
    rank: Number(additionalData.rank),
    zone: zone,
  });

  await em.persistAndFlush(authority);
  logger.info(`✅ Authority created successfully with DNI: ${person.dni}`);
}

/**
 * 🔥 FIX: Deletes a role record from the corresponding database table when a role is removed.
 * This maintains data integrity by ensuring users don't remain in role tables after role changes.
 *
 * @param em - Entity manager
 * @param roleToRemove - The role being removed (PARTNER, DISTRIBUTOR, or AUTHORITY)
 * @param person - The person entity with DNI identifier
 */
async function deleteRoleRecordForRoleChange(
  em: any,
  roleToRemove: Role,
  person: any
): Promise<void> {
  if (!person) {
    logger.warn('Cannot delete role record: person data is missing');
    return;
  }

  const dni = person.dni;
  logger.info(`🗑️ Deleting ${roleToRemove} record for DNI: ${dni}`);

  switch (roleToRemove) {
    case Role.PARTNER: {
      const { Partner } = await import('../../partner/partner.entity.js');
      const partner = await em.findOne(Partner, { dni });
      if (partner) {
        await em.removeAndFlush(partner);
        logger.info(`✅ Partner record deleted for DNI: ${dni}`);
      } else {
        logger.warn(`⚠️ Partner record not found for DNI: ${dni}, skipping deletion`);
      }
      break;
    }

    case Role.DISTRIBUTOR: {
      const { Distributor } = await import('../../distributor/distributor.entity.js');
      const distributor = await em.findOne(Distributor, { dni });
      if (distributor) {
        await em.removeAndFlush(distributor);
        logger.info(`✅ Distributor record deleted for DNI: ${dni}`);
      } else {
        logger.warn(`⚠️ Distributor record not found for DNI: ${dni}, skipping deletion`);
      }
      break;
    }

    case Role.AUTHORITY: {
      const { Authority } = await import('../../authority/authority.entity.js');
      const authority = await em.findOne(Authority, { dni });
      if (authority) {
        await em.removeAndFlush(authority);
        logger.info(`✅ Authority record deleted for DNI: ${dni}`);
      } else {
        logger.warn(`⚠️ Authority record not found for DNI: ${dni}, skipping deletion`);
      }
      break;
    }

    case Role.ADMIN:
      // ADMIN role doesn't have a separate table, only exists in user.roles array
      logger.info(`ℹ️ ADMIN role has no separate table, skipping deletion`);
      break;

    default:
      logger.warn(`⚠️ No deletion logic for role: ${roleToRemove}`);
  }
}