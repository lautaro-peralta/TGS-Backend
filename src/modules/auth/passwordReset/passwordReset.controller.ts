import { Request, Response } from 'express';
import argon2 from 'argon2';
import { orm } from '../../../shared/db/orm.js';
import { ResponseUtil } from '../../../shared/utils/response.util.js';
import logger from '../../../shared/utils/logger.js';
import { PasswordReset, PasswordResetStatus } from './passwordReset.entity.js';
import { emailService } from '../../../shared/services/email.service.js';
import { cacheService } from '../../../shared/services/cache.service.js';
import { User } from '../user/user.entity.js';
import { BasePersonEntity } from '../../../shared/base.person.entity.js';

export class PasswordResetController {
  constructor() {
    logger.info('PasswordResetController initialized');
  }

  /**
   * Requests password reset email
   *
   * SECURITY VALIDATIONS:
   * - User email must exist
   * - User must be active
   * - 5-minute cooldown between requests
   */
  async requestPasswordReset(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const { email } = req.body;

      // Find user
      const user = await em.findOne(User, { email });
      if (!user) {
        // Don't reveal if email exists (security best practice)
        return ResponseUtil.success(
          res,
          'If an account with this email exists, a password reset link has been sent'
        );
      }

      // Verify user is active
      if (!user.isActive) {
        return ResponseUtil.error(res, 'This account is inactive', 403);
      }

      // Check cooldown
      const cooldownKey = `password_reset_request:${email}`;
      const cooldownData = await cacheService.get(cooldownKey);

      if (cooldownData) {
        return ResponseUtil.error(
          res,
          'Please wait 5 minutes before requesting another password reset',
          429
        );
      }

      // Check for existing pending reset
      const existingReset = await em.findOne(PasswordReset, {
        email,
        status: PasswordResetStatus.PENDING,
      });

      if (existingReset && existingReset.isValid()) {
        const timeRemaining = Math.ceil(
          (existingReset.expiresAt.getTime() - Date.now()) / 1000 / 60
        );
        return ResponseUtil.error(
          res,
          `A password reset request is already pending. Expires in ${timeRemaining} minutes`,
          409
        );
      } else if (existingReset) {
        existingReset.markAsExpired();
        await em.flush();
      }

      // Create new reset request
      const passwordReset = new PasswordReset(email);
      em.persist(passwordReset);
      await em.flush();

      // Get user's name for email
      const person = await em.findOne(BasePersonEntity, { email });
      const userName = person?.name || user.username;

      // Send reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        email,
        passwordReset.token,
        userName
      );

      if (!emailSent) {
        logger.warn({ email }, 'Failed to send password reset email');
      }

      // Set cooldown cache
      await cacheService.set(
        cooldownKey,
        { requested: true, timestamp: Date.now() },
        5 * 60 // 5 minutes
      );

      return ResponseUtil.success(
        res,
        'If an account with this email exists, a password reset link has been sent'
      );
    } catch (error) {
      logger.error({ err: error }, 'Error requesting password reset');
      return ResponseUtil.internalError(
        res,
        'Error requesting password reset',
        error
      );
    }
  }

  /**
   * Resets password using token from email
   *
   * SECURITY VALIDATIONS:
   * - Token must be valid and not expired
   * - Token must not have been used
   * - New password requirements enforced
   * - Password hashed with Argon2
   */
  async resetPasswordWithToken(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const { token, newPassword } = req.body;

      // Find reset request
      const passwordReset = await em.findOne(PasswordReset, { token });

      if (!passwordReset) {
        return ResponseUtil.notFound(res, 'Password reset request', token);
      }

      // Verify token is valid
      if (!passwordReset.isValid()) {
        if (passwordReset.status === PasswordResetStatus.EXPIRED) {
          logger.warn(
            {
              token,
              email: passwordReset.email,
              expiredAt: passwordReset.expiresAt,
            },
            'User attempted password reset with expired token'
          );

          return ResponseUtil.error(
            res,
            'This password reset link has expired. Please request a new one.',
            400,
            [
              {
                field: 'token',
                message: 'Password reset token has expired',
                code: 'TOKEN_EXPIRED',
              },
            ]
          );
        }
        if (passwordReset.status === PasswordResetStatus.USED) {
          logger.warn(
            {
              token,
              email: passwordReset.email,
            },
            'User attempted password reset with already used token'
          );

          return ResponseUtil.error(
            res,
            'This password reset link has already been used.',
            400,
            [
              {
                field: 'token',
                message: 'Token has already been used',
                code: 'TOKEN_ALREADY_USED',
              },
            ]
          );
        }
      }

      // Find user and update password
      const user = await em.findOne(User, { email: passwordReset.email });
      if (!user) {
        logger.warn(
          { email: passwordReset.email },
          'Password reset user not found'
        );
        return ResponseUtil.error(res, 'User account not found', 404);
      }

      // Hash new password
      const hashedPassword = await argon2.hash(newPassword);
      user.password = hashedPassword;

      // Mark token as used
      passwordReset.markAsUsed();

      await em.flush();

      // Invalidate cache
      await cacheService.delete(
        `password_reset_request:${passwordReset.email}`
      );

      logger.info(
        {
          userId: user.id,
          email: user.email,
        },
        'Password reset successfully'
      );

      return ResponseUtil.success(res, 'Password has been reset successfully', {
        email: user.email,
        resetAt: passwordReset.usedAt!.toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error resetting password');
      return ResponseUtil.internalError(res, 'Error resetting password', error);
    }
  }

  /**
   * Validates a reset token (check if it's still valid)
   */
  async validateResetToken(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const { token } = req.params;

      const passwordReset = await em.findOne(PasswordReset, { token });

      if (!passwordReset) {
        return ResponseUtil.notFound(res, 'Password reset request', token);
      }

      const isValid = passwordReset.isValid();

      return ResponseUtil.success(res, 'Token validation result', {
        token,
        email: passwordReset.email,
        isValid,
        status: passwordReset.status,
        expiresAt: passwordReset.expiresAt.toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error validating reset token');
      return ResponseUtil.internalError(
        res,
        'Error validating reset token',
        error
      );
    }
  }

  /**
   * Gets password reset status (admin only)
   */
  async getResetStatus(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const { email } = req.params;

      const resets = await em.find(
        PasswordReset,
        { email },
        {
          orderBy: { createdAt: 'DESC' },
          limit: 1,
        }
      );

      if (resets.length === 0) {
        return ResponseUtil.notFound(res, 'Password reset request', email);
      }

      const latestReset = resets[0];

      return ResponseUtil.success(res, 'Password reset status retrieved', {
        email: latestReset.email,
        status: latestReset.status,
        usedAt: latestReset.usedAt?.toISOString(),
        expiresAt: latestReset.expiresAt.toISOString(),
        createdAt: latestReset.createdAt.toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting reset status');
      return ResponseUtil.internalError(
        res,
        'Error getting reset status',
        error
      );
    }
  }
}
