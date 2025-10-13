// ============================================================================
// EMAIL VERIFICATION ROUTES - Rutas para verificación de emails
// ============================================================================

import { Router } from 'express';
import { EmailVerificationController } from './emailVerification.controller.js';
import { validateWithSchema } from '../../../shared/middleware/validation.middleware.js';
import {
  requestEmailVerificationSchema,
  resendEmailVerificationSchema,
  verifyEmailTokenParamSchema,
  emailParamSchema,
} from './emailVerification.schema.js';

export const emailVerificationRouter = Router();
const emailVerificationController = new EmailVerificationController();

// ──────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/email-verification/request
 * @desc    Request automatic email verification via link
 * @access  Public
 */
emailVerificationRouter.post(
  '/request',
  validateWithSchema({ body: requestEmailVerificationSchema }),
  emailVerificationController.requestVerification
);

/**
 * @route   POST /api/email-verification/resend
 * @desc    Resend email verification link
 * @access  Public
 */
emailVerificationRouter.post(
  '/resend',
  validateWithSchema({ body: resendEmailVerificationSchema }),
  emailVerificationController.resendVerification
);

/**
 * @route   GET /api/email-verification/verify/:token
 * @desc    Verify email using token from email link
 * @access  Public
 */
emailVerificationRouter.get(
  '/verify/:token',
  validateWithSchema({ params: verifyEmailTokenParamSchema }),
  emailVerificationController.verifyEmail
);

/**
 * @route   GET /api/email-verification/status/:email
 * @desc    Get email verification status
 * @access  Public
 */
emailVerificationRouter.get(
  '/status/:email',
  validateWithSchema({ params: emailParamSchema }),
  emailVerificationController.getVerificationStatus
);

// Admin routes removed: email verification is fully automatic via token
