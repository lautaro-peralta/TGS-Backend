import { Router } from 'express';
import { PasswordResetController } from './passwordReset.controller.js';
import { validateWithSchema } from '../../../shared/middleware/validation.middleware.js';
import {
  requestPasswordResetSchema,
  resetPasswordWithTokenSchema,
  passwordResetTokenParamSchema,
  passwordResetEmailParamSchema,
} from './passwordReset.schema.js';

export const passwordResetRouter = Router();
const passwordResetController = new PasswordResetController();

/**
 * @swagger
 * /api/password-reset/request:
 *   post:
 *     tags: [Password Reset]
 *     summary: Request password reset email
 *     description: Sends a password reset link to the user's email
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
 *     responses:
 *       200:
 *         description: Reset email sent (or account not found for security)
 */
passwordResetRouter.post(
  '/request',
  validateWithSchema({ body: requestPasswordResetSchema }),
  passwordResetController.requestPasswordReset.bind(passwordResetController)
);

/**
 * @swagger
 * /api/password-reset/validate/{token}:
 *   get:
 *     tags: [Password Reset]
 *     summary: Validate reset token
 *     description: Checks if a password reset token is still valid
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
passwordResetRouter.get(
  '/validate/:token',
  validateWithSchema({ params: passwordResetTokenParamSchema }),
  passwordResetController.validateResetToken.bind(passwordResetController)
);

/**
 * @swagger
 * /api/password-reset/reset:
 *   post:
 *     tags: [Password Reset]
 *     summary: Reset password with token
 *     description: Resets password using token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 format: uuid
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 */
passwordResetRouter.post(
  '/reset',
  validateWithSchema({ body: resetPasswordWithTokenSchema }),
  passwordResetController.resetPasswordWithToken.bind(passwordResetController)
);

/**
 * @swagger
 * /api/password-reset/status/{email}:
 *   get:
 *     tags: [Password Reset]
 *     summary: Get password reset status
 *     description: Gets latest password reset request status (admin only)
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 */
passwordResetRouter.get(
  '/status/:email',
  validateWithSchema({ params: passwordResetEmailParamSchema }),
  passwordResetController.getResetStatus.bind(passwordResetController)
);

export default passwordResetRouter;
