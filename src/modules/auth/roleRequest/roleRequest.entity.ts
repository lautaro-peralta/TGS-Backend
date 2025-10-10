// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, Property, ManyToOne, Ref, PrimaryKey } from '@mikro-orm/core';
import { v7 as uuidv7 } from 'uuid';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { User, Role } from '../user/user.entity.js';

// ============================================================================
// ENUM - Request Status
// ============================================================================

/**
 * Status of a role request
 */
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// ============================================================================
// ENTITY - RoleRequest
// ============================================================================

/**
 * Represents a Role Request entity in the system.
 * Users can request special roles (PARTNER, DISTRIBUTOR, AUTHORITY) that require admin approval.
 * Can also be used to request a role change (swap one role for another).
 *
 * @class RoleRequest
 */
@Entity({ tableName: 'role_requests' })
export class RoleRequest {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The unique identifier for the role request.
   * Uses UUIDv7 for generation.
   *
   * @type {string}
   */
  @PrimaryKey({
    type: 'uuid',
    onCreate: () => uuidv7(),
  })
  id!: string;

  /**
   * The role being requested.
   *
   * @type {Role}
   */
  @Property({ type: 'string' })
  requestedRole!: Role;

  /**
   * The role to remove (optional, for role change/swap requests).
   * When specified, this indicates a role change request where the user
   * wants to replace roleToRemove with requestedRole.
   *
   * @type {Role | undefined}
   */
  @Property({ type: 'string', nullable: true })
  roleToRemove?: Role;

  /**
   * Status of the request (PENDING, APPROVED, REJECTED).
   *
   * @type {RequestStatus}
   */
  @Property({ type: 'string' })
  status: RequestStatus = RequestStatus.PENDING;

  /**
   * Justification for the role request.
   *
   * @type {string}
   */
  @Property({ type: 'text', nullable: true })
  justification?: string;

  /**
   * When the request was created.
   *
   * @type {Date}
   */
  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  /**
   * When the request was reviewed.
   *
   * @type {Date | undefined}
   */
  @Property({ nullable: true })
  reviewedAt?: Date;

  /**
   * Admin comments on the request.
   *
   * @type {string | undefined}
   */
  @Property({ type: 'text', nullable: true })
  adminComments?: string;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The user making the request.
   *
   * @type {Ref<User>}
   */
  @ManyToOne({ entity: () => User, nullable: false })
  user!: Ref<User>;

  /**
   * The admin who reviewed the request.
   *
   * @type {Ref<User> | undefined}
   */
  @ManyToOne({ entity: () => User, nullable: true })
  reviewedBy?: Ref<User>;

  // ──────────────────────────────────────────────────────────────────────────
  // Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Checks if the request is still pending.
   *
   * @returns {boolean} True if pending, false otherwise.
   */
  isPending(): boolean {
    return this.status === RequestStatus.PENDING;
  }

  /**
   * Approves the request.
   *
   * @param adminUser - The admin approving the request
   * @param comments - Optional admin comments
   */
  approve(adminUser: User, comments?: string): void {
    this.status = RequestStatus.APPROVED;
    this.reviewedBy = adminUser as any;
    this.reviewedAt = new Date();
    if (comments) this.adminComments = comments;
  }

  /**
   * Rejects the request.
   *
   * @param adminUser - The admin rejecting the request
   * @param comments - Optional admin comments
   */
  reject(adminUser: User, comments?: string): void {
    this.status = RequestStatus.REJECTED;
    this.reviewedBy = adminUser as any;
    this.reviewedAt = new Date();
    if (comments) this.adminComments = comments;
  }

  /**
   * Checks if this is a role change request (swap).
   *
   * @returns {boolean} True if this is a role change request, false otherwise.
   */
  isRoleChangeRequest(): boolean {
    return !!this.roleToRemove;
  }

  /**
   * Converts entity to DTO.
   */
  toDTO() {
    return {
      id: this.id,
      user: {
        id: (this.user as any).id,
        username: (this.user as any).username,
        email: (this.user as any).email,
      },
      requestedRole: this.requestedRole,
      roleToRemove: this.roleToRemove || null,
      isRoleChange: this.isRoleChangeRequest(),
      status: this.status,
      justification: this.justification,
      createdAt: this.createdAt.toISOString(),
      reviewedAt: this.reviewedAt?.toISOString(),
      reviewedBy: this.reviewedBy
        ? {
            id: (this.reviewedBy as any).id,
            username: (this.reviewedBy as any).username,
          }
        : null,
      adminComments: this.adminComments,
    };
  }
}
