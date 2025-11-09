// ============================================================================
// EMAIL VERIFICATION CONTROLLER - Controller for email verification
// ============================================================================

import { Request, Response } from 'express';
import { SqlEntityManager } from '@mikro-orm/postgresql';
import { orm } from '../../../shared/db/orm.js';
import { ResponseUtil } from '../../../shared/utils/response.util.js';
import { validateQueryParams } from '../../../shared/middleware/validation.middleware.js';
import logger from '../../../shared/utils/logger.js';
import { EmailVerification, EmailVerificationStatus } from './emailVerification.entity.js';
import { emailService } from '../../../shared/services/email.service.js';
import { cacheService } from '../../../shared/services/cache.service.js';
import { User } from '../user/user.entity.js';
import { BasePersonEntity } from '../../../shared/base.person.entity.js';

/**
 * Controller for handling automatic email verification
 *
 * This system is the classic "click the link in the email" to verify
 * that the user has access to the provided email address.
 *
 * This is DIFFERENT from UserVerification (manual verification by admin).
 */
export class EmailVerificationController {

  /**
   * Requests user verification with all personal data
   *
   * The user must have complete personal information (BasePersonEntity)
   * before requesting verification.
   *
   * SECURITY VALIDATIONS:
   * - User must be authenticated
   * - Can only request verification for their own email
   * - Only users with emailVerified: false can request
   */
  async requestVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: User must be authenticated
      // ────────────────────────────────────────────────────────────────────
      const user = (req as any).user;
      if (!user || !user.id) {
        return ResponseUtil.error(
          res,
          'Authentication required to request email verification',
          401,
          [
            {
              field: 'authentication',
              message: 'You must be logged in to request email verification',
              code: 'AUTHENTICATION_REQUIRED'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: Can only request verification for their own email
      // ────────────────────────────────────────────────────────────────────
      const currentUser = await em.findOne(User, { id: user.id });
      if (!currentUser) {
        return ResponseUtil.error(
          res,
          'User not found',
          404,
          [
            {
              field: 'user',
              message: 'User account not found',
              code: 'USER_NOT_FOUND'
            }
          ]
        );
      }

      if (currentUser.email !== email) {
        logger.warn({ 
          userId: user.id, 
          userEmail: currentUser.email, 
          requestedEmail: email 
        }, 'User attempted to request verification for different email');
        
        return ResponseUtil.error(
          res,
          'You can only request verification for your own email address',
          403,
          [
            {
              field: 'email',
              message: `You can only verify your own email: ${currentUser.email}`,
              code: 'EMAIL_OWNERSHIP_VIOLATION'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: Only users with emailVerified: false can request
      // ────────────────────────────────────────────────────────────────────
      if (currentUser.emailVerified) {
        return ResponseUtil.error(
          res,
          'Your email is already verified',
          409,
          [
            {
              field: 'email',
              message: 'This email has already been verified',
              code: 'EMAIL_ALREADY_VERIFIED'
            }
          ]
        );
      }

      // Verify that user's personal information exists
      const person = await em.findOne('BasePersonEntity', { email });
      if (!person) {
        return ResponseUtil.notFound(res, 'Person', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: Users with non-base roles should already be verified
      // ────────────────────────────────────────────────────────────────────
        // If user has roles other than USER, they should already be verified
      const hasNonBaseRoles = currentUser.roles.some(role => role !== 'USER');
        if (hasNonBaseRoles) {
          logger.warn({ 
            email, 
          userId: currentUser.id, 
          roles: currentUser.roles 
          }, 'User with non-base roles attempted email verification');
          
          return ResponseUtil.error(
            res,
            'Users with elevated roles are already verified and cannot request email verification',
            409,
            [
              {
                field: 'roles',
              message: `User has roles: ${currentUser.roles.join(', ')}. Email verification is not needed.`,
                code: 'ALREADY_VERIFIED_USER'
              }
            ]
          );
        }

      // Check if pending verification request already exists
      const existingVerification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (existingVerification) {
        // If exists and not expired, check if 2 minutes have passed
        if (existingVerification.isValid()) {
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

          if (existingVerification.createdAt > twoMinutesAgo) {
            // Less than 2 minutes, return error with remaining time
            const timeRemaining = Math.ceil((existingVerification.createdAt.getTime() + 2 * 60 * 1000 - Date.now()) / 1000 / 60);
            return ResponseUtil.error(
              res,
              `A verification request is already pending. Please wait ${timeRemaining} minutes before requesting another verification`,
              409,
              [
                {
                  field: 'cooldown',
                  message: `Please wait ${timeRemaining} minutes before requesting another verification`,
                  code: 'VERIFICATION_COOLDOWN_ACTIVE'
                }
              ]
            );
          } else {
            // 2 minutes have passed, mark previous as expired
            logger.info({
              email,
              previousVerificationId: existingVerification.id,
              createdAt: existingVerification.createdAt
            }, 'Previous verification request expired due to new request after 2 minutes');

            existingVerification.markAsExpired();
            await em.flush();
          }
        } else {
          // If already expired, remove it
          await em.removeAndFlush(existingVerification);
        }
      }

      // Create new verification request
      const verification = new EmailVerification(email);
      em.persist(verification);
      await em.flush();

      // Send verification notification email to user
      const emailSent = await emailService.sendVerificationEmail(
        email,
        verification.token,
        (person as any).name
      );

      if (!emailSent) {
        logger.warn({ email }, 'Failed to send verification notification email');
        // Don't fail the request if email cannot be sent
      }

      // Cache request to prevent spam (2 minutes cooldown)
      await cacheService.set(
        `verification_request:${email}`,
        { requested: true, timestamp: Date.now() },
        2 * 60 // 2 minutes cooldown
      );

      return ResponseUtil.created(res, 'User verification request submitted successfully', {
        id: verification.id,
        email: verification.email,
        expiresAt: verification.expiresAt.toISOString(),
        emailSent,
      });

    } catch (error) {
      logger.error({ err: error }, 'Error requesting user verification');
      return ResponseUtil.internalError(res, 'Error requesting user verification', error);
    }
  }

  /**
   * Verifies the verification token (official automatic flow via link)
   *
   * This endpoint confirms email verification using the token
   * sent via email. Does not require administrator intervention.
   */
  async verifyEmail(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Token is already validated by Zod schema
      const { token } = req.params;

      // Find verification request
      const verification = await em.findOne(EmailVerification, { token });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Verification request', token);
      }

      // Verify that it's valid
      if (!verification.isValid()) {
        if (verification.status === EmailVerificationStatus.EXPIRED) {
          logger.warn({ 
            token, 
            email: verification.email,
            expiredAt: verification.expiresAt,
            createdAt: verification.createdAt 
          }, 'User attempted to verify with expired token');
          
          return ResponseUtil.error(
            res, 
            'This verification link has expired and is no longer valid. Please request a new verification email.',
            400,
            [
              {
                field: 'token',
                message: 'Verification token has expired',
                code: 'TOKEN_EXPIRED'
              }
            ]
          );
        }
        if (verification.status === EmailVerificationStatus.VERIFIED) {
          logger.info({ 
            token, 
            email: verification.email,
            verifiedAt: verification.verifiedAt 
          }, 'User attempted to verify already verified email');
          
          return ResponseUtil.error(
            res, 
            'This email has already been verified',
            400,
            [
              {
                field: 'email',
                message: 'Email has already been verified',
                code: 'EMAIL_ALREADY_VERIFIED'
              }
            ]
          );
        }
      }

      // Mark as verified
      verification.markAsVerified();

      // ────────────────────────────────────────────────────────────────────
      // Update User.emailVerified = true
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { email: verification.email });
      if (user) {
        user.emailVerified = true;
        user.updateProfileCompleteness();
        
        logger.info({ 
          userId: user.id, 
          email: verification.email 
        }, 'User email verified successfully');
      } else {
        logger.warn({ 
          email: verification.email 
        }, 'Email verified but no associated user found');
      }

      await em.flush();

      // Find user's personal information to send welcome email
      const person = await em.findOne('BasePersonEntity', { email: verification.email });

      if (person) {
        // Send welcome email
        await emailService.sendWelcomeEmail(verification.email, (person as any).name);

        // Invalidate user-related cache
        await cacheService.invalidateUserCache((person as any).dni);
      }

      return ResponseUtil.success(res, 'User verified successfully', {
        email: verification.email,
        verifiedAt: verification.verifiedAt!.toISOString(),
      });

    } catch (error) {
      logger.error({ err: error }, 'Error verifying user');
      return ResponseUtil.internalError(res, 'Error verifying user', error);
    }
  }

  /**
   * Resends verification request notification
   *
   * SECURITY VALIDATIONS:
   * - User must be authenticated
   * - Can only resend verification for their own email
   */
  async resendVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: User must be authenticated
      // ────────────────────────────────────────────────────────────────────
      const user = (req as any).user;
      if (!user || !user.id) {
        return ResponseUtil.error(
          res,
          'Authentication required to resend email verification',
          401,
          [
            {
              field: 'authentication',
              message: 'You must be logged in to resend email verification',
              code: 'AUTHENTICATION_REQUIRED'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: Can only resend verification for their own email
      // ────────────────────────────────────────────────────────────────────
      const currentUser = await em.findOne(User, { id: user.id });
      if (!currentUser) {
        return ResponseUtil.error(
          res,
          'User not found',
          404,
          [
            {
              field: 'user',
              message: 'User account not found',
              code: 'USER_NOT_FOUND'
            }
          ]
        );
      }

      if (currentUser.email !== email) {
        logger.warn({ 
          userId: user.id, 
          userEmail: currentUser.email, 
          requestedEmail: email 
        }, 'User attempted to resend verification for different email');
        
        return ResponseUtil.error(
          res,
          'You can only resend verification for your own email address',
          403,
          [
            {
              field: 'email',
              message: `You can only resend verification for your own email: ${currentUser.email}`,
              code: 'EMAIL_OWNERSHIP_VIOLATION'
            }
          ]
        );
      }

      // Verify resend cooldown (2 minutes)
      const cooldownKey = `verification_request:${email}`;
      const cooldownData = await cacheService.get(cooldownKey);

      if (cooldownData) {
        return ResponseUtil.error(res, 'Please wait 2 minutes before requesting another verification', 429);
      }

      // Find user's personal information
      const person = await em.findOne('BasePersonEntity', { email });
      if (!person) {
        return ResponseUtil.notFound(res, 'Person', email);
      }

      // Find existing verification
      const verification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (verification && verification.isValid()) {
        // Resend existing notification
        const emailSent = await emailService.sendVerificationEmail(
          email,
          verification.token,
          (person as any).name
        );

        if (emailSent) {
          // Update cooldown (2 minutes)
          await cacheService.set(cooldownKey, { requested: true, timestamp: Date.now() }, 2 * 60);

          return ResponseUtil.success(res, 'Verification request resent successfully');
        } else {
          return ResponseUtil.internalError(res, 'Failed to send verification notification');
        }
      } else {
        // Create new verification
        return this.requestVerification(req, res);
      }

    } catch (error) {
      logger.error({ err: error }, 'Error resending verification request');
      return ResponseUtil.internalError(res, 'Error resending verification request', error);
    }
  }

  /**
   * Resends email verification for unverified users (without authentication)
   *
   * This endpoint allows users who registered but haven't verified their email
   * to request a new verification email using only their email address.
   *
   * VALIDATIONS:
   * - Email must exist in the database
   * - User must not have verified email
   * - 2-minute cooldown between resends
   */
  async resendVerificationForUnverified(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: User must exist in the database
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { email });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: User must not have verified email
      // ────────────────────────────────────────────────────────────────────
      if (user.emailVerified) {
        return ResponseUtil.error(
          res,
          'Your email is already verified. You can log in normally.',
          409,
          [
            {
              field: 'email',
              message: 'Email is already verified',
              code: 'EMAIL_ALREADY_VERIFIED'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // VALIDATION: Verify resend cooldown (2 minutes)
      // ────────────────────────────────────────────────────────────────────
      const cooldownKey = `verification_request:${email}`;
      const cooldownData = await cacheService.get(cooldownKey);

      if (cooldownData) {
        return ResponseUtil.error(res, 'Please wait 2 minutes before requesting another verification', 429);
      }

      // ────────────────────────────────────────────────────────────────────
      // Find existing verification
      // ────────────────────────────────────────────────────────────────────
      const existingVerification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (existingVerification && existingVerification.isValid()) {
        // Resend existing notification
        const emailSent = await emailService.sendVerificationEmail(
          email,
          existingVerification.token,
          user.username // Use username as temporary name
        );

        if (emailSent) {
          // Update cooldown (2 minutes)
          await cacheService.set(cooldownKey, { requested: true, timestamp: Date.now() }, 2 * 60);

          return ResponseUtil.success(res, 'Verification email resent successfully');
        } else {
          return ResponseUtil.internalError(res, 'Failed to send verification notification');
        }
      } else {
        // Create new verification
        const verification = new EmailVerification(email);
        em.persist(verification);
        await em.flush();

        // Send verification email
        const emailSent = await emailService.sendVerificationEmail(
          email,
          verification.token,
          user.username
        );

        if (emailSent) {
          // Cache request to prevent spam (2 minutes cooldown)
          await cacheService.set(cooldownKey, { requested: true, timestamp: Date.now() }, 2 * 60);

          return ResponseUtil.success(res, 'New verification email sent successfully');
        } else {
          return ResponseUtil.internalError(res, 'Failed to send verification notification');
        }
      }

    } catch (error) {
      logger.error({ err: error }, 'Error resending verification for unverified user');
      return ResponseUtil.internalError(res, 'Error resending verification request', error);
    }
  }

  /**
   * Gets the verification status of a user by email
   */
  async getVerificationStatus(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.params;

      // Find verifications for this email
      const verifications = await em.find(EmailVerification, { email }, {
        orderBy: { createdAt: 'DESC' },
        limit: 1,
      });

      if (verifications.length === 0) {
        return ResponseUtil.notFound(res, 'Verification request', email);
      }

      const latestVerification = verifications[0];

      return ResponseUtil.success(res, 'User verification status retrieved', {
        email: latestVerification.email,
        status: latestVerification.status,
        verifiedAt: latestVerification.verifiedAt?.toISOString(),
        expiresAt: latestVerification.expiresAt.toISOString(),
        createdAt: latestVerification.createdAt.toISOString(),
      });

    } catch (error) {
      logger.error({ err: error }, 'Error getting user verification status');
      return ResponseUtil.internalError(res, 'Error getting user verification status', error);
    }
  }

  /**
   * Cancels a user verification request (admin only)
   */
  async cancelVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.params;

      // Find pending verification
      const verification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // Mark as expired
      verification.markAsExpired();
      await em.flush();

      // Clear cooldown cache
      await cacheService.delete(`verification_request:${email}`);

      return ResponseUtil.success(res, 'User verification request cancelled successfully');

    } catch (error) {
      logger.error({ err: error }, 'Error cancelling user verification');
      return ResponseUtil.internalError(res, 'Error cancelling user verification', error);
    }
  }

  /**
   * Gets all user verification requests (admin only)
   */
  async getAllVerifications(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const { status, page = 1, limit = 10 } = req.query;

      const statusFilter = status ? (Array.isArray(status) ? status[0] : status) : undefined;
      const verifications = statusFilter
        ? await em.find(EmailVerification, { status: statusFilter as EmailVerificationStatus }, {
            orderBy: { createdAt: 'DESC' },
            limit: Number(limit),
            offset: (Number(page) - 1) * Number(limit),
          })
        : await em.find(EmailVerification, {}, {
            orderBy: { createdAt: 'DESC' },
            limit: Number(limit),
            offset: (Number(page) - 1) * Number(limit),
          });

      const total = statusFilter
        ? await em.count(EmailVerification, { status: statusFilter as EmailVerificationStatus })
        : await em.count(EmailVerification);

      const result = verifications.map((v: EmailVerification) => ({
        id: v.id,
        email: v.email,
        token: v.token,
        status: v.status,
        expiresAt: v.expiresAt.toISOString(),
        verifiedAt: v.verifiedAt?.toISOString(),
        createdAt: v.createdAt.toISOString(),
      }));

      return ResponseUtil.success(res, 'User verifications retrieved successfully', result, 200, {
        total,
        page: Number(page),
        limit: Number(limit),
        hasNextPage: Number(page) * Number(limit) < total,
        hasPrevPage: Number(page) > 1,
      });

    } catch (error) {
      logger.error({ err: error }, 'Error getting all user verifications');
      return ResponseUtil.internalError(res, 'Error getting user verifications', error);
    }
  }

  /**
   * Approves a user verification request (admin only)
   *
   * This process verifies all user information:
   * - Complete personal data (DNI, name, email, phone, address)
   * - Unique and non-duplicated email
   * - Unique DNI in the system
   *
   * Automatic validations:
   * - Verifies that no other user exists with the same verified email
   * - Verifies that no other user exists with the same DNI
   * - Updates User.emailVerified = true
   * - Recalculates user's profileCompleteness
   */
  async approveVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.params;

      // ────────────────────────────────────────────────────────────────────
      // 1. Find the pending verification request
      // ────────────────────────────────────────────────────────────────────
      const verification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // 2. Find the user associated with this email
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { email });

      if (!user) {
        logger.warn({ email }, 'Verification request without associated User');
        return ResponseUtil.error(
          res,
          'No user account found for this email',
          404
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // 3. VALIDATION: Verify that the user is not already verified
      // ────────────────────────────────────────────────────────────────────
      if (user.isVerified) {
        logger.warn({ email, userId: user.id }, 'Attempt to verify already verified user');
        return ResponseUtil.error(
          res,
          'This user is already verified',
          409
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // 4. Find user's personal information
      // ────────────────────────────────────────────────────────────────────
      const person = await em.findOne(BasePersonEntity, { email });

      if (!person) {
        logger.warn({ email }, 'Verification request without personal information');
        return ResponseUtil.error(
          res,
          'User must have complete personal information before verification',
          400
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // 5. CRITICAL VALIDATION: Verify duplicate DNI
      // ────────────────────────────────────────────────────────────────────
      const duplicateDNI = await em.findOne(BasePersonEntity, {
        dni: person.dni,
        email: { $ne: email }, // Exclude current email
      });

      if (duplicateDNI) {
        logger.error(
          { 
            email, 
            dni: person.dni, 
            duplicateEmail: duplicateDNI.email 
          }, 
          'Duplicate DNI detected during verification'
        );

        // Mark as expired
        verification.markAsExpired();
        await em.flush();

        return ResponseUtil.error(
          res,
          `A user with DNI ${person.dni} already exists (email: ${duplicateDNI.email})`,
          409,
          [
            {
              field: 'dni',
              message: `DNI ${person.dni} is already registered`,
              code: 'DUPLICATE_DNI'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // 6. VALIDATION: Verify duplicate verified user with same email
      // ────────────────────────────────────────────────────────────────────
      const duplicateVerifiedUser = await em.findOne(User, {
        email,
        isVerified: true,
        id: { $ne: user.id }, // Exclude current user
      });

      if (duplicateVerifiedUser) {
        logger.error(
          { 
            email, 
            userId: user.id,
            duplicateUserId: duplicateVerifiedUser.id
          }, 
          'Another verified user with this email already exists'
        );

        return ResponseUtil.error(
          res,
          'Another verified user with this email already exists',
          409,
          [
            {
              field: 'email',
              message: 'Email is already used by another verified user',
              code: 'DUPLICATE_VERIFIED_USER'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // 7. APPROVE: Update User.isVerified
      // ────────────────────────────────────────────────────────────────────
      user.isVerified = true;

      // ────────────────────────────────────────────────────────────────────
      // 8. Recalculate profileCompleteness
      // ────────────────────────────────────────────────────────────────────
      user.updateProfileCompleteness();

      // ────────────────────────────────────────────────────────────────────
      // 9. Mark verification as completed
      // ────────────────────────────────────────────────────────────────────
      verification.markAsVerified();

      // ────────────────────────────────────────────────────────────────────
      // 10. Persist all changes
      // ────────────────────────────────────────────────────────────────────
      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // 11. Send welcome email to user
      // ────────────────────────────────────────────────────────────────────
      await emailService.sendWelcomeEmail(email, person.name);

      // ────────────────────────────────────────────────────────────────────
      // 12. Invalidate related cache
      // ────────────────────────────────────────────────────────────────────
      await cacheService.invalidateUserCache(person.dni);
      await cacheService.delete(`verification_request:${email}`);

      logger.info(
        { 
          email, 
          userId: user.id, 
          dni: person.dni,
          profileCompleteness: user.profileCompleteness 
        }, 
        'User verification approved successfully'
      );

      return ResponseUtil.success(res, 'User verification approved successfully', {
        email: verification.email,
        verifiedAt: verification.verifiedAt!.toISOString(),
        user: {
          id: user.id,
          isVerified: user.isVerified,
          profileCompleteness: user.profileCompleteness,
          canPurchase: user.canPurchase(),
        },
      });

    } catch (error) {
      logger.error({ err: error }, 'Error approving user verification');
      return ResponseUtil.internalError(res, 'Error approving user verification', error);
    }
  }

  /**
   * Rejects a user verification request (admin only)
   *
   * Rejection allows the user to correct their information and request
   * verification again. The cooldown is removed to allow immediate retry.
   */
  async rejectVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.params;
      const { reason } = req.body; // Optional reason for rejection

      // ────────────────────────────────────────────────────────────────────
      // 1. Find the pending verification request
      // ────────────────────────────────────────────────────────────────────
      const verification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // 2. Mark verification as expired
      // ────────────────────────────────────────────────────────────────────
      verification.markAsExpired();
      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // 3. Clear cooldown cache to allow new request
      // ────────────────────────────────────────────────────────────────────
      await cacheService.delete(`verification_request:${email}`);

      // ────────────────────────────────────────────────────────────────────
      // 4. (Optional) Send rejection notification email to user
      // ────────────────────────────────────────────────────────────────────
      const person = await em.findOne(BasePersonEntity, { email });
      if (person && reason) {
        // TODO: Implement emailService.sendRejectionEmail if needed
        logger.info({ email, reason }, 'User verification rejected - notification not sent');
      }

      logger.info({ email, reason }, 'User verification rejected by admin');

      return ResponseUtil.success(res, 'User verification rejected successfully', {
        email,
        reason: reason || 'No reason provided',
        canRetry: true,
        message: 'The user can correct their information and request verification again',
      });

    } catch (error) {
      logger.error({ err: error }, 'Error rejecting user verification');
      return ResponseUtil.internalError(res, 'Error rejecting user verification', error);
    }
  }
}
