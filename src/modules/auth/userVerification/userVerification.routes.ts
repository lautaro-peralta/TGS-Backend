// ============================================================================
// USER VERIFICATION ROUTES - Routes for user verification
// ============================================================================

import { Router } from 'express';
import { UserVerificationController } from './userVerification.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth.middleware.js';
import { Role } from '../user/user.entity.js';
import { validateWithSchema } from '../../../shared/middleware/validation.middleware.js';
import {
  requestUserVerificationSchema,
  resendUserVerificationSchema,
  emailParamSchema,
  getAllUserVerificationsQuerySchema,
  rejectUserVerificationSchema,
} from './userVerification.schema.js';

export const userVerificationRouter = Router();
const userVerificationController = new UserVerificationController();

// ──────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/user-verification/request:
 *   post:
 *     tags: [User Verification]
 *     summary: Request user verification
 *     description: Submit a request for user verification validating all personal data (DNI, name, email, phone, address)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address to verify
 *                 example: "thomas.shelby@shelbyltd.co.uk"
 *     responses:
 *       200:
 *         description: Verification request submitted successfully
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
 *                   example: "User verification request submitted. Awaiting admin approval."
 *       400:
 *         description: Invalid email or user already verified
 *       409:
 *         description: Verification request already pending
 */
userVerificationRouter.post(
  '/request',
  validateWithSchema({ body: requestUserVerificationSchema }),
  userVerificationController.requestVerification
);

/**
 * @swagger
 * /api/user-verification/resend:
 *   post:
 *     tags: [User Verification]
 *     summary: Resend verification request
 *     description: Resends user verification request for users with pending or expired requests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "arthur.shelby@shelbyltd.co.uk"
 *     responses:
 *       200:
 *         description: Verification request resent successfully
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
 *                   example: "User verification request resent"
 *       400:
 *         description: Invalid email or user already verified
 *       404:
 *         description: User not found
 */
userVerificationRouter.post(
  '/resend',
  validateWithSchema({ body: resendUserVerificationSchema }),
  userVerificationController.resendVerification
);

/**
 * @swagger
 * /api/user-verification/status/{email}:
 *   get:
 *     tags: [User Verification]
 *     summary: Get verification status
 *     description: Retrieves the user verification status for a specific email address
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User's email address
 *         example: "thomas.shelby@shelbyltd.co.uk"
 *     responses:
 *       200:
 *         description: User verification status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "thomas.shelby@shelbyltd.co.uk"
 *                     isVerified:
 *                       type: boolean
 *                       example: false
 *                     status:
 *                       type: string
 *                       enum: [PENDING, VERIFIED, EXPIRED, CANCELLED]
 *                       example: "PENDING"
 *       400:
 *         description: Invalid email format
 *       404:
 *         description: User or verification not found
 */
userVerificationRouter.get(
  '/status/:email',
  validateWithSchema({ params: emailParamSchema }),
  userVerificationController.getVerificationStatus
);

// ──────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/user-verification/admin/all:
 *   get:
 *     tags: [User Verification]
 *     summary: Get all verification requests (Admin)
 *     description: Retrieves all user verification requests with optional filtering by status
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, VERIFIED, EXPIRED, CANCELLED]
 *         description: Filter by verification status
 *         example: "PENDING"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: List of verification requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                       user:
 *                         type: object
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 */
userVerificationRouter.get(
  '/admin/all',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ query: getAllUserVerificationsQuerySchema }),
  userVerificationController.getAllVerifications
);

/**
 * @swagger
 * /api/user-verification/admin/cancel/{email}:
 *   delete:
 *     tags: [User Verification]
 *     summary: Cancel verification request (Admin)
 *     description: Cancels a pending user verification request
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User's email address
 *         example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Verification request cancelled successfully
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
 *                   example: "User verification request cancelled"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Verification request not found
 */
userVerificationRouter.delete(
  '/admin/cancel/:email',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: emailParamSchema }),
  userVerificationController.cancelVerification
);

/**
 * @swagger
 * /api/user-verification/admin/approve/{email}:
 *   post:
 *     tags: [User Verification]
 *     summary: Approve user verification (Admin)
 *     description: |
 *       Approves user verification after validating all personal data. This endpoint:
 *       - Verifies user has complete personal information (DNI, name, email, phone, address)
 *       - Verifies email is not already verified
 *       - Verifies DNI is not duplicated in the system
 *       - Updates User.isVerified = true
 *       - Recalculates profileCompleteness
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User's email address to approve
 *         example: "thomas.shelby@shelbyltd.co.uk"
 *     responses:
 *       200:
 *         description: User verified successfully
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
 *                   example: "User verified successfully. Welcome to the Shelby Company!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                       example: true
 *                     profileCompleteness:
 *                       type: number
 *                       example: 100
 *       400:
 *         description: User missing required information or already verified
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 *       409:
 *         description: DNI already in use by another user
 */
userVerificationRouter.post(
  '/admin/approve/:email',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: emailParamSchema }),
  userVerificationController.approveVerification
);

/**
 * @swagger
 * /api/user-verification/admin/reject/{email}:
 *   post:
 *     tags: [User Verification]
 *     summary: Reject user verification (Admin)
 *     description: Rejects a user verification request with an optional reason
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User's email address to reject
 *         example: "suspicious.user@example.com"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Optional reason for rejection
 *                 example: "Incomplete personal information. Please provide valid DNI and address."
 *     responses:
 *       200:
 *         description: User verification rejected
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
 *                   example: "User verification rejected"
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User or verification request not found
 */
userVerificationRouter.post(
  '/admin/reject/:email',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({
    params: emailParamSchema,
    body: rejectUserVerificationSchema,
  }),
  userVerificationController.rejectVerification
);
