// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';
import type { FilterQuery } from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Notification, NotificationStatus, NotificationType } from './notification.entity.js';
import { User } from '../auth/user/user.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import logger from '../../shared/utils/logger.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to create a notification
 * Can be used by other controllers to create notifications
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: 'role-request' | 'user-verification' | 'system';
  metadata?: Record<string, any>;
}): Promise<Notification> {
  const em = orm.em.fork();

  const user = await em.findOne(User, { id: params.userId });
  if (!user) {
    throw new Error(`User with ID ${params.userId} not found`);
  }

  const notification = em.create(Notification, {
    user,
    type: params.type,
    title: params.title,
    message: params.message,
    status: NotificationStatus.UNREAD,
    createdAt: new Date(),
    relatedEntityId: params.relatedEntityId,
    relatedEntityType: params.relatedEntityType,
    metadata: params.metadata,
  });

  await em.persistAndFlush(notification);

  logger.info(
    {
      notificationId: notification.id,
      type: params.type,
      userId: params.userId,
    },
    `Notification created for user ${params.userId}`
  );

  return notification;
}

const toSingleString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : undefined;
  }

  return typeof value === 'string' ? value : undefined;
};

const toPositiveInt = (value: unknown, defaultValue: number): number => {
  const parsed = Number(toSingleString(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const isEnumValue = <T extends Record<string, string>>(
  enumObject: T,
  value?: string
): value is T[keyof T] => {
  if (!value) {
    return false;
  }

  return Object.values(enumObject).includes(value as T[keyof T]);
};

// ============================================================================
// CONTROLLER - Notification
// ============================================================================

/**
 * Controller for handling notification operations
 * @class NotificationController
 */
export class NotificationController {
  // ──────────────────────────────────────────────────────────────────────────
  // GET MY NOTIFICATIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Gets all notifications for the authenticated user
   *
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @returns 200 with notifications array
   */
  async getMyNotifications(req: Request, res: Response) {
    const em = orm.em.fork();
    const userId = (req as any).user.id;

    try {
      const notifications = await em.find(
        Notification,
        { user: userId },
        {
          orderBy: { createdAt: 'DESC' },
        }
      );

      return ResponseUtil.success(
        res,
        'Notifications retrieved successfully',
        notifications.map((n) => n.toDTO())
      );
    } catch (error) {
      logger.error({ err: error }, 'Error retrieving notifications');
      return ResponseUtil.error(res, 'Failed to retrieve notifications', 500);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MARK AS READ
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Marks a notification as read
   *
   * @param req - Express request with notification ID
   * @param res - Express response
   * @returns 200 with updated notification
   */
  async markAsRead(req: Request, res: Response) {
    const em = orm.em.fork();
    const userId = (req as any).user.id;
    const notificationId = req.params.id;

    try {
      const notification = await em.findOne(Notification, {
        id: notificationId,
        user: userId,
      });

      if (!notification) {
        return ResponseUtil.error(res, 'Notification not found', 404);
      }

      notification.markAsRead();
      await em.flush();

      return ResponseUtil.success(res, 'Notification marked as read', notification.toDTO());
    } catch (error) {
      logger.error({ err: error }, 'Error marking notification as read');
      return ResponseUtil.error(res, 'Failed to mark notification as read', 500);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MARK ALL AS READ
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Marks all notifications as read for the authenticated user
   *
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @returns 200 with success message
   */
  async markAllAsRead(req: Request, res: Response) {
    const em = orm.em.fork();
    const userId = (req as any).user.id;

    try {
      const notifications = await em.find(Notification, {
        user: userId,
        status: NotificationStatus.UNREAD,
      });

      notifications.forEach((notification) => {
        notification.markAsRead();
      });

      await em.flush();

      return ResponseUtil.success(
        res,
        `${notifications.length} notifications marked as read`,
        { count: notifications.length }
      );
    } catch (error) {
      logger.error({ err: error }, 'Error marking all notifications as read');
      return ResponseUtil.error(res, 'Failed to mark notifications as read', 500);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET UNREAD COUNT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Gets the count of unread notifications for the authenticated user
   *
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @returns 200 with unread count
   */
  async getUnreadCount(req: Request, res: Response) {
    const em = orm.em.fork();
    const userId = (req as any).user.id;

    try {
      const count = await em.count(Notification, {
        user: userId,
        status: NotificationStatus.UNREAD,
      });

      return res.status(200).json({ count });
    } catch (error) {
      logger.error({ err: error }, 'Error getting unread count');
      return ResponseUtil.error(res, 'Failed to get unread count', 500);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE NOTIFICATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a notification
   *
   * @param req - Express request with notification ID
   * @param res - Express response
   * @returns 200 with success message
   */
  async deleteNotification(req: Request, res: Response) {
    const em = orm.em.fork();
    const userId = (req as any).user.id;
    const notificationId = req.params.id;

    try {
      const notification = await em.findOne(Notification, {
        id: notificationId,
        user: userId,
      });

      if (!notification) {
        return ResponseUtil.error(res, 'Notification not found', 404);
      }

      await em.removeAndFlush(notification);

      return ResponseUtil.success(res, 'Notification deleted successfully');
    } catch (error) {
      logger.error({ err: error }, 'Error deleting notification');
      return ResponseUtil.error(res, 'Failed to delete notification', 500);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE NOTIFICATION (Admin/System only)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new notification (admin/system use)
   *
   * @param req - Express request with notification data
   * @param res - Express response
   * @returns 201 with created notification
   */
  async createNotification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const { userId, type, title, message, relatedEntityId, relatedEntityType, metadata } =
        req.body;

      const user = await em.findOne(User, { id: userId });
      if (!user) {
        return ResponseUtil.error(res, 'User not found', 404);
      }

      const notification = em.create(Notification, {
        user,
        type,
        title,
        message,
        status: NotificationStatus.UNREAD,
        createdAt: new Date(),
        relatedEntityId,
        relatedEntityType,
        metadata,
      });

      await em.persistAndFlush(notification);

      return ResponseUtil.success(res, 'Notification created successfully', notification.toDTO(), 201);
    } catch (error) {
      logger.error({ err: error }, 'Error creating notification');
      return ResponseUtil.error(res, 'Failed to create notification', 500);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH NOTIFICATIONS (Admin only)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Searches notifications with filters and pagination (admin only)
   *
   * @param req - Express request with query params
   * @param res - Express response
   * @returns 200 with paginated notifications
   */
  async searchNotifications(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const page = toPositiveInt(req.query.page, 1);
      const limit = toPositiveInt(req.query.limit, 20);
      const status = toSingleString(req.query.status);
      const type = toSingleString(req.query.type);
      const userId = toSingleString(req.query.userId);

      const filters: FilterQuery<Notification> = {};
      if (isEnumValue(NotificationStatus, status)) {
        filters.status = status;
      }
      if (isEnumValue(NotificationType, type)) {
        filters.type = type;
      }
      if (userId) {
        filters.user = userId;
      }

      const [notifications, total] = await em.findAndCount(
        Notification,
        filters,
        {
          limit,
          offset: (page - 1) * limit,
          orderBy: { createdAt: 'DESC' },
        }
      );

      const unreadCount = await em.count(Notification, {
        ...filters,
        status: NotificationStatus.UNREAD,
      });

      return res.status(200).json({
        data: notifications.map((n) => n.toDTO()),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error searching notifications');
      return ResponseUtil.error(res, 'Failed to search notifications', 500);
    }
  }
}
