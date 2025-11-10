// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { NotificationController } from './notification.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import { createNotificationSchema, searchNotificationsSchema } from './notification.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Notification
// ============================================================================
export const notificationRouter = Router();
const notificationController = new NotificationController();

// ──────────────────────────────────────────────────────────────────────────
// USER ROUTES (Authenticated)
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/notifications/me
 * @desc    Get all notifications for the authenticated user
 * @access  Private (Authenticated users)
 */
notificationRouter.get(
  '/me',
  authMiddleware,
  notificationController.getMyNotifications
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private (Authenticated users)
 */
notificationRouter.get(
  '/unread-count',
  authMiddleware,
  notificationController.getUnreadCount
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private (Authenticated users)
 */
notificationRouter.patch(
  '/:id/read',
  authMiddleware,
  notificationController.markAsRead
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (Authenticated users)
 */
notificationRouter.patch(
  '/read-all',
  authMiddleware,
  notificationController.markAllAsRead
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private (Authenticated users)
 */
notificationRouter.delete(
  '/:id',
  authMiddleware,
  notificationController.deleteNotification
);

// ──────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification (admin/system use)
 * @access  Private (Admin only)
 */
notificationRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: createNotificationSchema }),
  notificationController.create
);

/**
 * @route   GET /api/notifications
 * @desc    Search notifications with filters (admin only)
 * @access  Private (Admin only)
 */
notificationRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  notificationController.search
);
