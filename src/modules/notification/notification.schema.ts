// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { NotificationType, NotificationStatus } from './notification.entity.js';
import { paginationSchema } from '../../shared/schemas/common.schema.js';

// ============================================================================
// SCHEMAS - Notification
// ============================================================================

/**
 * Zod schema for creating a notification.
 * Used for manual notification creation (admin or system).
 */
export const createNotificationSchema = z.object({
  /**
   * User ID who will receive the notification
   */
  userId: z.string().uuid({ message: 'Invalid user ID' }),

  /**
   * Type of notification
   */
  type: z.nativeEnum(NotificationType, {
    message: 'Invalid notification type',
  }),

  /**
   * Title of the notification
   */
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title cannot exceed 255 characters'),

  /**
   * Message/content of the notification
   */
  message: z
    .string()
    .min(1, 'Message is required')
    .max(1000, 'Message cannot exceed 1000 characters'),

  /**
   * Related entity ID (optional)
   */
  relatedEntityId: z.string().optional(),

  /**
   * Related entity type (optional)
   */
  relatedEntityType: z
    .enum(['role-request', 'user-verification', 'system'] as const, {
      message: 'Invalid related entity type',
    })
    .optional(),

  /**
   * Additional metadata (optional)
   */
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Zod schema for marking notification as read
 */
export const markAsReadSchema = z.object({
  /**
   * Notification ID
   */
  id: z.string().uuid({ message: 'Invalid notification ID' }),
});

/**
 * Zod schema for searching notifications
 */
export const searchNotificationsSchema = paginationSchema.extend({
  /**
   * Filter by status
   */
  status: z.nativeEnum(NotificationStatus).optional(),

  /**
   * Filter by type
   */
  type: z.nativeEnum(NotificationType).optional(),

  /**
   * Filter by user ID
   */
  userId: z.string().uuid({ message: 'Invalid user ID' }).optional(),
});
