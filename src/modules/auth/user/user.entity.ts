// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, Property, OneToOne, Ref, PrimaryKey } from '@mikro-orm/core';
import { v7 as uuidv7 } from 'uuid';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BasePersonEntity } from '../../../shared/base.person.entity.js';

// ============================================================================
// ENUM - Role
// ============================================================================
/**
 * Enum for user roles.
 * @enum {string}
 */
export enum Role {
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  CLIENT = 'CLIENT',
  USER = 'USER',
  AUTHORITY = 'AUTHORITY',
}

// ============================================================================
// ENTITY - User
// ============================================================================
/**
 * Represents a User entity in the system.
 * This entity is mapped to the 'users' table in the database.
 *
 * @class User
 */
@Entity({ tableName: 'users' })
export class User {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The unique identifier for the user.
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
   * The user's unique username.
   *
   * @type {string}
   */
  @Property({ type: String, unique: true })
  username!: string;

  /**
   * The user's unique email address.
   *
   * @type {string}
   */
  @Property({ type: String, unique: true })
  email!: string;

  /**
   * The user's hashed password.
   *
   * @type {string}
   */
  @Property({ type: String })
  password!: string;

  /**
   * The roles assigned to the user.
   * Defaults to [Role.USER].
   *
   * @type {Role[]}
   */
  @Property({ type: 'string[]' })
  roles: Role[] = [Role.USER];

  /**
   * Indicates if the user account is active.
   *
   * @type {boolean}
   */
  @Property({ type: Boolean, default: true })
  isActive: boolean = true;

  /**
   * Indicates if the user has been verified by admin.
   * This includes verification of ALL personal data: DNI, name, email, phone, address.
   * This is different from email validation (automatic).
   *
   * @type {boolean}
   */
  @Property({ type: Boolean, default: false })
  isVerified: boolean = false;

  /**
   * Indicates if the user's email has been validated (automatic).
   * This is a simple email ownership validation (click on link).
   * Different from user verification (manual by admin).
   *
   * @type {boolean}
   */
  @Property({ type: Boolean, default: false })
  emailVerified: boolean = false;

  /**
   * The timestamp of the user's last login.
   *
   * @type {Date | undefined}
   */
  @Property({ type: Date, nullable: true })
  lastLoginAt?: Date;

  /**
   * The completeness percentage of the user's profile.
   *
   * @type {number}
   */
  @Property({ type: Number, default: 25 })
  profileCompleteness: number = 25;

  /**
   * The timestamp when the user was created.
   *
   * @type {Date}
   */
  @Property({ type: Date, defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  /**
   * The timestamp when the user was last updated.
   *
   * @type {Date}
   */
  @Property({ type: Date, defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The personal information associated with the user.
   * This defines a one-to-one relationship with the BasePersonEntity.
   *
   * @type {Ref<BasePersonEntity> | undefined}
   */
  @OneToOne({ entity: () => BasePersonEntity, nullable: true, owner: true })
  person?: Ref<BasePersonEntity>;

  // ──────────────────────────────────────────────────────────────────────────
  // Constructor
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates an instance of User.
   *
   * @param {string} username - The username.
   * @param {string} email - The email address.
   * @param {string} password - The password.
   * @param {Role[]} [roles=[Role.USER]] - The roles of the user.
   */
  constructor(
    username: string,
    email: string,
    password: string,
    roles: Role[] = [Role.USER]
  ) {
    this.username = username;
    this.email = email;
    this.password = password;
    this.roles = roles;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the User entity to a Data Transfer Object (DTO).
   *
   * @returns {object} The user DTO.
   */
  toDTO() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      roles: this.roles,
      isActive: this.isActive,
      isVerified: this.isVerified,
      emailVerified: this.emailVerified,
      profileCompleteness: this.profileCompleteness,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      lastLoginAt: this.lastLoginAt?.toISOString(),
      hasPersonalInfo: this.hasPersonalInfo,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Getters and Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Checks if the user has complete personal information.
   * Verifies that all required fields in BasePersonEntity are filled.
   *
   * @readonly
   * @type {boolean}
   */
  get hasPersonalInfo(): boolean {
    if (!this.person) return false;

    const person = this.person as any;
    // Check all required fields from BasePersonEntity
    return !!(
      person.dni &&
      person.name &&
      person.email &&
      person.phone &&
      person.address
    );
  }

  /**
   * Gets the display name for the user.
   *
   * @readonly
   * @type {string}
   */
  get displayName(): string {
    return this.person?.getEntity().name || this.username;
  }

  /**
   * Determines if the user can perform a specific action.
   *
   * @param {('purchase' | 'admin')} action - The action to perform.
   * @returns {boolean} True if the user can perform the action, false otherwise.
   */
  canPerformAction(action: 'purchase' | 'admin'): boolean {
    switch (action) {
      case 'purchase':
        // Users can only purchase if user is verified (all data validated by admin)
        return this.isVerified && this.hasPersonalInfo && this.profileCompleteness === 100;
      case 'admin':
        return this.profileCompleteness === 100;
      default:
        return true;
    }
  }

  /**
   * Calculates the completeness of the user's profile.
   *
   * Profile completeness breakdown:
   * - 25% for having an account
   * - 25% for user verification (verified by admin)
   * - 50% for complete personal data (all fields: DNI, name, email, phone, address)
   *
   * Note: Email validation (automatic) doesn't affect profile completeness,
   * only user verification (manual by admin) does.
   *
   * @returns {number} The profile completeness percentage (0-100).
   */
  calculateProfileCompleteness(): number {
    let completeness = 25; // Base for having an account

    if (this.isVerified) {
      completeness += 25; // +25% for user verification
    }

    if (this.hasPersonalInfo) {
      completeness += 50; // +50% for complete personal data
    }

    return Math.min(completeness, 100);
  }

  /**
   * Checks if the user can make purchases.
   * Requires user verification (by admin) and complete personal information.
   *
   * @returns {boolean} True if user can purchase, false otherwise.
   */
  canPurchase(): boolean {
    return this.isVerified && this.hasPersonalInfo;
  }

  /**
   * Updates the profile completeness.
   */
  updateProfileCompleteness(): void {
    this.profileCompleteness = this.calculateProfileCompleteness();
  }

  /**
   * Gets suggestions for improving the user's profile.
   *
   * @returns {string[]} An array of profile suggestions.
   */
  getProfileSuggestions(): string[] {
    const suggestions: string[] = [];

    if (!this.emailVerified) {
      suggestions.push('Validate your email address by clicking the link sent to your inbox');
    }

    if (!this.isVerified) {
      suggestions.push('Request user verification to increase profile completeness and enable purchases');
    }

    if (!this.person) {
      suggestions.push(
        'Complete your personal information (DNI, name, phone, address) to request user verification'
      );
    }

    return suggestions;
  }

  /**
   * Gets specific suggestions for purchase requirements.
   *
   * @returns {string[]} An array of suggestions to enable purchases.
   */
  getPurchaseRequirementSuggestions(): string[] {
    const suggestions: string[] = [];

    if (!this.isVerified) {
      suggestions.push('Get your account verified by an administrator');
    }

    if (!this.person) {
      suggestions.push('Complete your personal information (DNI, name, phone, address)');
    }

    return suggestions;
  }
}
