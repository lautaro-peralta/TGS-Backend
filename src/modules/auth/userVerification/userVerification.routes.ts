// ============================================================================
// USER VERIFICATION ROUTES - Rutas para verificación de usuarios
// ============================================================================

import { Router } from 'express';
import { UserVerificationController } from './userVerification.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth.middleware.js';
import { Role } from '../user/user.entity.js';
import { validateWithSchema } from '../../../shared/middleware/validation.middleware.js';
import {
  requestUserVerificationSchema,
  resendUserVerificationSchema,
  verifyTokenParamSchema,
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
 * @route   POST /api/user-verification/request
 * @desc    Request user verification (validates all personal data: DNI, name, email, phone, address)
 * @access  Public
 */
userVerificationRouter.post(
  '/request',
  validateWithSchema({ body: requestUserVerificationSchema }),
  userVerificationController.requestVerification
);

/**
 * @route   POST /api/user-verification/resend
 * @desc    Resend user verification request
 * @access  Public
 */
userVerificationRouter.post(
  '/resend',
  validateWithSchema({ body: resendUserVerificationSchema }),
  userVerificationController.resendVerification
);

/**
 * @route   GET /api/user-verification/verify/:token
 * @desc    Verify user using token (DEPRECATED - Use admin approval instead)
 * @access  Public
 * @deprecated This endpoint is kept for backward compatibility but user verification
 *             should be done manually by admin through /admin/approve/:email
 */
userVerificationRouter.get(
  '/verify/:token',
  validateWithSchema({ params: verifyTokenParamSchema }),
  userVerificationController.verifyEmail
);

/**
 * @route   GET /api/user-verification/status/:email
 * @desc    Get user verification status for email
 * @access  Public
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
 * @route   GET /api/user-verification/admin/all
 * @desc    Get all user verification requests (Admin only)
 * @access  Private (Admin only)
 */
userVerificationRouter.get(
  '/admin/all',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ query: getAllUserVerificationsQuerySchema }),
  userVerificationController.getAllVerifications
);

/**
 * @route   DELETE /api/user-verification/admin/cancel/:email
 * @desc    Cancel user verification request (Admin only)
 * @access  Private (Admin only)
 */
userVerificationRouter.delete(
  '/admin/cancel/:email',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: emailParamSchema }),
  userVerificationController.cancelVerification
);

/**
 * @route   POST /api/user-verification/admin/approve/:email
 * @desc    Approve user verification (validates all personal data) (Admin only)
 * @access  Private (Admin only)
 * @validations:
 *   - Verifies user has complete personal information (DNI, name, email, phone, address)
 *   - Verifies email is not already verified
 *   - Verifies DNI is not duplicated in the system
 *   - Updates User.isVerified = true
 *   - Recalculates profileCompleteness
 */
userVerificationRouter.post(
  '/admin/approve/:email',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: emailParamSchema }),
  userVerificationController.approveVerification
);

/**
 * @route   POST /api/user-verification/admin/reject/:email
 * @desc    Reject user verification request (Admin only)
 * @access  Private (Admin only)
 * @body    { reason?: string } - Optional reason for rejection
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
