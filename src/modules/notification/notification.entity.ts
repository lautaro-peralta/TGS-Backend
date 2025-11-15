// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, Property, ManyToOne, Ref, PrimaryKey } from '@mikro-orm/core';
import { v7 as uuidv7 } from 'uuid';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { User } from '../auth/user/user.entity.js';

// ============================================================================
// ENUM - Notification Type
// ============================================================================

/**
 * Type of notification
 */
export enum NotificationType {
  USER_VERIFICATION_APPROVED = 'USER_VERIFICATION_APPROVED',
  USER_VERIFICATION_REJECTED = 'USER_VERIFICATION_REJECTED',
  ROLE_REQUEST_APPROVED = 'ROLE_REQUEST_APPROVED',
  ROLE_REQUEST_REJECTED = 'ROLE_REQUEST_REJECTED',
  SYSTEM = 'SYSTEM',
}

// ============================================================================
// ENUM - Notification Status
// ============================================================================

/**
 * Status of a notification
 */
export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
}

// ============================================================================
// TYPES - Related Entity Type
// ============================================================================

/**
 * Type of entity related to the notification
 */
export type RelatedEntityType = 'role-request' | 'user-verification' | 'system';

// ============================================================================
// ENTITY - Notification
// ============================================================================

/**
 * Represents a Notification entity in the system.
 * Notifications are created when important events occur (role approval, verification, etc.)
 *
 * @class Notification
 */
@Entity({ tableName: 'notifications' })
export class Notification {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The unique identifier for the notification.
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
   * Type of notification (USER_VERIFICATION_APPROVED, ROLE_REQUEST_APPROVED, etc.)
   *
   * @type {NotificationType}
   */
  @Property({ type: 'string' })
  type!: NotificationType;

  /**
   * Title of the notification
   *
   * @type {string}
   */
  @Property({ type: 'string', length: 255 })
  title!: string;

  /**
   * Message/content of the notification
   *
   * @type {string}
   */
  @Property({ type: 'text' })
  message!: string;

  /**
   * Status of the notification (UNREAD or READ)
   *
   * @type {NotificationStatus}
   */
  @Property({ type: 'string' })
  status: NotificationStatus = NotificationStatus.UNREAD;

  /**
   * ID of the related entity (e.g., role request ID, verification ID)
   *
   * @type {string | undefined}
   */
  @Property({ type: 'string', nullable: true })
  relatedEntityId?: string;

  /**
   * Type of the related entity
   *
   * @type {RelatedEntityType | undefined}
   */
  @Property({ type: 'string', nullable: true })
  relatedEntityType?: RelatedEntityType;

  /**
   * Additional metadata in JSON format
   *
   * @type {Record<string, any> | undefined}
   */
  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  /**
   * When the notification was created
   *
   * @type {Date}
   */
  @Property({ defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  /**
   * When the notification was read
   *
   * @type {Date | undefined}
   */
  @Property({ nullable: true })
  readAt?: Date;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The user who receives this notification
   *
   * @type {Ref<User>}
   */
  @ManyToOne({ entity: () => User, nullable: false })
  user!: Ref<User>;

  // ──────────────────────────────────────────────────────────────────────────
  // Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Checks if the notification is unread
   *
   * @returns {boolean} True if unread, false otherwise
   */
  isUnread(): boolean {
    return this.status === NotificationStatus.UNREAD;
  }

  /**
   * Marks the notification as read
   */
  markAsRead(): void {
    this.status = NotificationStatus.READ;
    this.readAt = new Date();
  }

  /**
   * Converts entity to DTO for API responses
   */
  toDTO() {
    return {
      id: this.id,
      userId: (this.user as any).id,
      type: this.type,
      title: this.title,
      message: this.message,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      readAt: this.readAt?.toISOString(),
      relatedEntityId: this.relatedEntityId,
      relatedEntityType: this.relatedEntityType,
      metadata: this.metadata,
    };
  }
}
