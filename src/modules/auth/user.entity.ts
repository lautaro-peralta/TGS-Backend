// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, Property, OneToOne, Ref, PrimaryKey } from '@mikro-orm/core';
import { v7 as uuidv7 } from 'uuid';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BasePersonEntity } from '../../shared/base.person.entity.js';

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
  @Property({ unique: true })
  username!: string;

  /**
   * The user's unique email address.
   *
   * @type {string}
   */
  @Property({ unique: true })
  email!: string;

  /**
   * The user's hashed password.
   *
   * @type {string}
   */
  @Property()
  password!: string;

  /**
   * The roles assigned to the user.
   * Defaults to [Role.CLIENT].
   *
   * @type {Role[]}
   */
  @Property({ type: 'string[]' })
  roles: Role[] = [Role.CLIENT];

  /**
   * Indicates if the user account is active.
   *
   * @type {boolean}
   */
  //@Property({ default: true })
  //isActive: boolean = true;

  /**
   * Indicates if the user's email has been verified.
   *
   * @type {boolean}
   */
  //@Property({ default: false })
  //emailVerified: boolean = false;

  /**
   * Token for email verification.
   *
   * @type {string | undefined}
   */
  //@Property({ nullable: true })
  //emailVerificationToken?: string;

  /**
   * Token for password reset.
   *
   * @type {string | undefined}
   */
  //@Property({ nullable: true })
  //passwordResetToken?: string;

  /**
   * Expiration date for the password reset token.
   *
   * @type {Date | undefined}
   */
  //@Property({ nullable: true })
  //passwordResetExpiresAt?: Date;

  /**
   * The timestamp of the user's last login.
   *
   * @type {Date | undefined}
   */
  //@Property({ nullable: true })
  //lastLoginAt?: Date;

  /**
   * The completeness percentage of the user's profile.
   *
   * @type {number}
   */
  //@Property({ default: 25 })
  //profileCompleteness: number = 25;

  /**
   * The timestamp when the user was created.
   *
   * @type {Date}
   */
  //@Property()
  //createdAt: Date = new Date();

  /**
   * The timestamp when the user was last updated.
   *
   * @type {Date}
   */
  //@Property({ onUpdate: () => new Date() })
  //updatedAt: Date = new Date();

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
   * @param {Role[]} [roles=[Role.CLIENT]] - The roles of the user.
   */
  constructor(
    username: string,
    email: string,
    password: string,
    roles: Role[] = [Role.CLIENT]
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
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Getters and Methods
  // ──────────────────────────────────────────────────────────────────────────
  /*
  /**
   * Checks if the user has personal information.
   *
//   * @readonly
//   * @type {boolean}
//   */
  //  get hasPersonalInfo(): boolean {
  //    return !!this.person;
  //  }
  //
  //  /**
  //   * Gets the display name for the user.
  //   *
  //   * @readonly
  //   * @type {string}
  //   */
  //  get displayName(): string {
  //    return this.person?.getEntity().name || this.username;
  //  }
  //
  //  /**
  //   * Determines if the user can perform a specific action.
  //   *
  //   * @param {('purchase' | 'withdrawal' | 'verification')} action - The action to perform.
  //   * @returns {boolean} True if the user can perform the action, false otherwise.
  //   */
  //  canPerformAction(
  //    action: 'purchase' | 'withdrawal' | 'verification'
  //  ): boolean {
  //    switch (action) {
  //      case 'purchase':
  //        return this.emailVerified; // Requires verified email
  //      case 'withdrawal':
  //      case 'verification':
  //        return this.hasPersonalInfo && this.emailVerified; // Requires personal data
  //      default:
  //        return true;
  //    }
  //  }
  //
  //  /**
  //   * Calculates the completeness of the user's profile.
  //   *
  //   * @returns {number} The profile completeness percentage.
  //   */
  //  calculateProfileCompleteness(): number {
  //    let completeness = 25; // Base for having an account
  //
  //    if (this.emailVerified) completeness += 25; // +25% for verified email
  //    if (this.person) {
  //      completeness += 35; // +35% for basic personal data
  //
  //      // Bonus for additional verifications
  //      // if (this.person.documentVerified) completeness += 10;
  //      // if (this.person.phoneVerified) completeness += 5;
  //    }
  //
  //    return Math.min(completeness, 100);
  //  }
  //
  //  /**
  //   * Gets suggestions for improving the user's profile.
  //   *
  //   * @returns {string[]} An array of profile suggestions.
  //   */
  //  getProfileSuggestions(): string[] {
  //    const suggestions: string[] = [];
  //
  //    if (!this.emailVerified) {
  //      suggestions.push('Verify your email for better security');
  //    }
  //
  //    if (!this.person) {
  //      suggestions.push(
  //        'Complete your personal profile to access more features'
  //      );
  //    } else {
  //      // if (!this.person.documentVerified) {
  //      //   suggestions.push('Verify your identity document');
  //      // }
  //      // if (!this.person.phoneVerified && this.person.phoneNumber) {
  //      //   suggestions.push('Verify your phone number');
  //      // }
  //    }
  //
  //    return suggestions;
  //  }
}
