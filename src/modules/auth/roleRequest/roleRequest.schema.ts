// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { Role } from '../user/user.entity.js';
import { RequestStatus } from './roleRequest.entity.js';
import { paginationSchema } from '../../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Role Request
// ============================================================================

/**
 * Zod schema for creating a role request.
 * Only PARTNER, DISTRIBUTOR, and AUTHORITY roles can be requested.
 * Can optionally include roleToRemove for role change/swap requests.
 */
export const createRoleRequestSchema = z.object({
  /**
   * The role being requested.
   * Only special roles that require approval.
   */
  requestedRole: z
    .enum([Role.PARTNER, Role.DISTRIBUTOR, Role.AUTHORITY] as const)
    .refine(
      (role) => [Role.PARTNER, Role.DISTRIBUTOR, Role.AUTHORITY].includes(role),
      { message: 'Only PARTNER, DISTRIBUTOR, or AUTHORITY roles can be requested' }
    ),
  /**
   * The role to remove (optional, for role change requests).
   * When specified, this becomes a role swap request.
   */
  roleToRemove: z
    .enum([Role.PARTNER, Role.DISTRIBUTOR, Role.AUTHORITY, Role.ADMIN] as const)
    .optional(),
  /**
   * Justification for the role request.
   */
  justification: z
    .string()
    .min(20, 'Justification must be at least 20 characters')
    .max(500, 'Justification cannot exceed 500 characters')
    .optional(),
}).refine(
  (data) => {
    // If roleToRemove is specified, it must be different from requestedRole
    if (data.roleToRemove && data.roleToRemove === data.requestedRole) {
      return false;
    }
    return true;
  },
  {
    message: 'roleToRemove must be different from requestedRole',
    path: ['roleToRemove'],
  }
);

/**
 * Zod schema for reviewing a role request.
 */
export const reviewRoleRequestSchema = {
  /**
   * URL parameters.
   */
  params: z.object({
    /**
     * Request ID. Must be a valid UUID.
     */
    id: z.uuid('Invalid request ID'),
  }),
  /**
   * Request body.
   */
  body: z.object({
    /**
     * Whether to approve or reject.
     */
    action: z.enum(['approve', 'reject'], {
      message: 'Action must be either "approve" or "reject"',
    }),
    /**
     * Admin comments on the decision.
     */
    comments: z.string().max(500, 'Comments cannot exceed 500 characters').optional(),
  }),
};

/**
 * Zod schema for searching role requests.
 */
export const searchRoleRequestsSchema = paginationSchema.extend({
  /**
   * Filter by status.
   */
  status: z.enum(RequestStatus).optional(),
  /**
   * Filter by requested role.
   */
  requestedRole: z.enum(Role).optional(),
  /**
   * Filter by user ID.
   */
  userId: z.uuid().optional(),
});
