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
 * @swagger
 * /api/notifications/me:
 *   get:
 *     tags: [Notifications]
 *     summary: Get my notifications
 *     description: Retrieves all notifications for the authenticated user, ordered by creation date (newest first)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notifications retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "550e8400-e29b-41d4-a716-446655440000"
 *                       type:
 *                         type: string
 *                         enum: [INFO, SUCCESS, WARNING, ERROR, ROLE_REQUEST]
 *                         example: "INFO"
 *                       title:
 *                         type: string
 *                         example: "New notification"
 *                       message:
 *                         type: string
 *                         example: "You have a new update"
 *                       status:
 *                         type: string
 *                         enum: [UNREAD, READ]
 *                         example: "UNREAD"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-11T10:30:00Z"
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
notificationRouter.get(
  '/me',
  authMiddleware,
  notificationController.getMyNotifications
);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notifications count
 *     description: Returns the count of unread notifications for the authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
notificationRouter.get(
  '/unread-count',
  authMiddleware,
  notificationController.getUnreadCount
);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     description: Marks a specific notification as read for the authenticated user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification marked as read"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
notificationRouter.patch(
  '/:id/read',
  authMiddleware,
  notificationController.markAsRead
);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications as read for the authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "5 notifications marked as read"
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
notificationRouter.patch(
  '/read-all',
  authMiddleware,
  notificationController.markAllAsRead
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete notification
 *     description: Deletes a specific notification for the authenticated user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
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
 * @swagger
 * /api/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Create notification (Admin only)
 *     description: Creates a new notification for a specific user (admin/system use only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *               - title
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user to notify
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               type:
 *                 type: string
 *                 enum: [INFO, SUCCESS, WARNING, ERROR, ROLE_REQUEST]
 *                 description: Type of notification
 *                 example: "INFO"
 *               title:
 *                 type: string
 *                 description: Notification title
 *                 example: "System Update"
 *               message:
 *                 type: string
 *                 description: Notification message
 *                 example: "Your account has been updated"
 *               relatedEntityId:
 *                 type: string
 *                 description: Optional related entity ID
 *               relatedEntityType:
 *                 type: string
 *                 enum: [role-request, user-verification, system]
 *                 description: Optional related entity type
 *               metadata:
 *                 type: object
 *                 description: Optional additional metadata
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
notificationRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: createNotificationSchema }),
  notificationController.createNotification
);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Search notifications (Admin only)
 *     description: Search and filter all notifications with pagination (admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Results per page
 *         example: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UNREAD, READ]
 *         description: Filter by notification status
 *         example: "UNREAD"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INFO, SUCCESS, WARNING, ERROR, ROLE_REQUEST]
 *         description: Filter by notification type
 *         example: "INFO"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Search results with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                 unreadCount:
 *                   type: integer
 *                   example: 15
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
notificationRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  notificationController.searchNotifications
);
