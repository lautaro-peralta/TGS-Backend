// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, Property, ManyToOne, Ref, PrimaryKey } from '@mikro-orm/core';
import { v7 as uuidv7 } from 'uuid';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { User } from './user/user.entity.js';

// ============================================================================
// ENTITY - RefreshToken
// ============================================================================

/**
 * Represents a Refresh Token entity in the system.
 * Used for JWT refresh token rotation and secure authentication.
 *
 * @class RefreshToken
 */
@Entity({ tableName: 'refresh_tokens' })
export class RefreshToken {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The unique identifier for the refresh token.
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
   * The actual refresh token string (hashed).
   *
   * @type {string}
   */
  @Property({ unique: true })
  token!: string;

  /**
   * When the token expires.
   *
   * @type {Date}
   */
  @Property()
  expiresAt!: Date;

  /**
   * When the token was created.
   *
   * @type {Date}
   */
  @Property()
  createdAt: Date = new Date();

  /**
   * IP address from which the token was created.
   *
   * @type {string | undefined}
   */
  @Property({ nullable: true })
  ipAddress?: string;

  /**
   * User agent string from which the token was created.
   *
   * @type {string | undefined}
   */
  @Property({ nullable: true })
  userAgent?: string;

  /**
   * Whether the token has been revoked.
   *
   * @type {boolean}
   */
  @Property({ default: false })
  isRevoked: boolean = false;

  /**
   * When the token was revoked (if applicable).
   *
   * @type {Date | undefined}
   */
  @Property({ nullable: true })
  revokedAt?: Date;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The user this refresh token belongs to.
   *
   * @type {Ref<User>}
   */
  @ManyToOne({ entity: () => User, nullable: false, onDelete: 'cascade' })
  user!: Ref<User>;

  // ──────────────────────────────────────────────────────────────────────────
  // Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Checks if the token is expired.
   *
   * @returns {boolean} True if expired, false otherwise.
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Checks if the token is active (not revoked and not expired).
   *
   * @returns {boolean} True if active, false otherwise.
   */
  isActive(): boolean {
    return !this.isRevoked && !this.isExpired();
  }

  /**
   * Revokes the token.
   */
  revoke(): void {
    this.isRevoked = true;
    this.revokedAt = new Date();
  }
}
