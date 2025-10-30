// ============================================================================
// EMAIL VERIFICATION ROUTES - Rutas para verificación de emails
// ============================================================================

import { Router } from 'express';
import { EmailVerificationController } from './emailVerification.controller.js';
import { validateWithSchema } from '../../../shared/middleware/validation.middleware.js';
import { authMiddleware } from '../auth.middleware.js';
import {
  requestEmailVerificationSchema,
  resendEmailVerificationSchema,
  verifyEmailTokenParamSchema,
  emailParamSchema,
} from './emailVerification.schema.js';

export const emailVerificationRouter = Router();
const emailVerificationController = new EmailVerificationController();

// ──────────────────────────────────────────────────────────────────────────
// AUTHENTICATED ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/email-verification/request:
 *   post:
 *     tags: [Email Verification]
 *     summary: Request email verification
 *     description: Request automatic email verification via link sent to user's email (Authenticated users only)
 *     security:
 *       - cookieAuth: []
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
 *                 description: Email address to verify
 *                 example: "thomas.shelby@shelbyltd.co.uk"
 *     responses:
 *       200:
 *         description: Verification email sent successfully
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
 *                   example: "Verification email sent. Please check your inbox."
 *       400:
 *         description: Invalid email format or email already verified
 *       401:
 *         description: Unauthorized - Authentication required
 */
emailVerificationRouter.post(
  '/request',
  authMiddleware,
  validateWithSchema({ body: requestEmailVerificationSchema }),
  emailVerificationController.requestVerification
);

/**
 * @swagger
 * /api/email-verification/resend:
 *   post:
 *     tags: [Email Verification]
 *     summary: Resend verification email
 *     description: Resends the email verification link to authenticated users
 *     security:
 *       - cookieAuth: []
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
 *                 description: Email address for resending verification
 *                 example: "arthur.shelby@shelbyltd.co.uk"
 *     responses:
 *       200:
 *         description: Verification email resent successfully
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
 *                   example: "Verification email resent successfully"
 *       400:
 *         description: Invalid email or email already verified
 *       401:
 *         description: Unauthorized - Authentication required
 */
emailVerificationRouter.post(
  '/resend',
  authMiddleware,
  validateWithSchema({ body: resendEmailVerificationSchema }),
  emailVerificationController.resendVerification
);

/**
 * @swagger
 * /api/email-verification/resend-unverified:
 *   post:
 *     tags: [Email Verification]
 *     summary: Resend verification for unverified users
 *     description: Allows unverified users to resend their email verification link without authentication
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
 *                 description: Unverified user's email address
 *                 example: "polly.gray@shelbyltd.co.uk"
 *     responses:
 *       200:
 *         description: Verification email resent successfully
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
 *                   example: "Verification email resent to unverified user"
 *       400:
 *         description: Invalid email or user not found
 *       404:
 *         description: User not found or already verified
 */
emailVerificationRouter.post(
  '/resend-unverified',
  validateWithSchema({ body: resendEmailVerificationSchema }),
  emailVerificationController.resendVerificationForUnverified
);

// ──────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/email-verification/verify/{token}:
 *   get:
 *     tags: [Email Verification]
 *     summary: Verify email using token
 *     description: Verifies user's email address using the token from verification email link
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Email verification token from the email link
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Email verified successfully
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
 *                   example: "Email verified successfully. Welcome to the Shelby Company!"
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: Verification request not found
 */
emailVerificationRouter.get(
  '/verify/:token',
  validateWithSchema({ params: verifyEmailTokenParamSchema }),
  emailVerificationController.verifyEmail
);

/**
 * @swagger
 * /api/email-verification/status/{email}:
 *   get:
 *     tags: [Email Verification]
 *     summary: Get email verification status
 *     description: Checks the verification status for a given email address
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to check
 *         example: "thomas.shelby@shelbyltd.co.uk"
 *     responses:
 *       200:
 *         description: Email verification status
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
 *                       example: true
 *                     status:
 *                       type: string
 *                       enum: [PENDING, VERIFIED, EXPIRED]
 *                       example: "VERIFIED"
 *       400:
 *         description: Invalid email format
 *       404:
 *         description: Email not found
 */
emailVerificationRouter.get(
  '/status/:email',
  validateWithSchema({ params: emailParamSchema }),
  emailVerificationController.getVerificationStatus
);

// Admin routes removed: email verification is fully automatic via token
