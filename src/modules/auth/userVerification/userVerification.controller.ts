// ============================================================================
// USER VERIFICATION CONTROLLER - Controller for user verification
// ============================================================================

import { Request, Response } from 'express';
import { SqlEntityManager } from '@mikro-orm/postgresql';
import { orm } from '../../../shared/db/orm.js';
import { ResponseUtil } from '../../../shared/utils/response.util.js';
import { validateQueryParams } from '../../../shared/middleware/validation.middleware.js';
import logger from '../../../shared/utils/logger.js';
import { UserVerification, UserVerificationStatus } from './userVerification.entity.js';
import { emailService } from '../../../shared/services/email.service.js';
import { cacheService } from '../../../shared/services/cache.service.js';
import { User, Role } from '../user/user.entity.js';
import { BasePersonEntity } from '../../../shared/base.person.entity.js';
import { env } from '../../../config/env.js';
import { sendNotificationToUser } from '../../notification/notification.controller.js';
import { NotificationType } from '../../notification/notification.entity.js';

/**
 * Controller for handling user verification requests
 *
 * This system verifies all user information (DNI, name, email,
 * phone, address) through manual administrator approval.
 */
export class UserVerificationController {

  /**
   * Requests user verification with all personal data
   *
   * The user must have complete personal information (BasePersonEntity)
   * before being able to request verification.
   */
  async requestVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // 1. Verify that the user has their email verified
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { email });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', email);
      }

      if (!user.emailVerified) {
        logger.warn({
          email,
          userId: user.id,
          emailVerified: user.emailVerified
        }, 'Attempt to request user verification without verified email');

        return ResponseUtil.error(
          res,
          'You must verify your email address before requesting account verification',
          403,
          [
            {
              field: 'emailVerified',
              message: 'Email verification is required before requesting user verification',
              code: 'EMAIL_NOT_VERIFIED'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // 2. Verify that user's personal information exists
      // ────────────────────────────────────────────────────────────────────
      const person = await em.findOne('BasePersonEntity', { email });
      if (!person) {
        return ResponseUtil.notFound(res, 'Person', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // 3. Check if a recent pending request already exists
      // ────────────────────────────────────────────────────────────────────
      const existingVerification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (existingVerification) {
        // If it exists and hasn't expired, return error
        if (existingVerification.isValid()) {
          return ResponseUtil.conflict(res, 'A verification request is already pending for this email');
        }

        // If it has expired, delete it
        await em.removeAndFlush(existingVerification);
      }

      // ────────────────────────────────────────────────────────────────────
      // 4. Check previous attempts and accumulate them
      // ────────────────────────────────────────────────────────────────────
      const previousVerifications = await em.find(UserVerification, {
        email,
        status: { $in: [UserVerificationStatus.CANCELLED, UserVerificationStatus.EXPIRED] }
      });

      // Calculate total attempts from previous verifications
      const totalPreviousAttempts = previousVerifications.reduce((sum, v) => sum + v.attempts, 0);

      // Check if user has exceeded maximum attempts
      const maxAttempts = 3;
      if (totalPreviousAttempts >= maxAttempts) {
        logger.warn({
          email,
          totalPreviousAttempts,
          maxAttempts
        }, 'User has exceeded maximum verification attempts');

        return ResponseUtil.error(
          res,
          'Maximum verification attempts exceeded',
          403,
          [
            {
              field: 'attempts',
              message: `You have exceeded the maximum number of verification attempts (${maxAttempts}). Please contact support if you believe this is an error.`,
              code: 'MAX_ATTEMPTS_EXCEEDED'
            }
          ]
        );
      }

      // Create new verification request with accumulated attempts
      const verification = new UserVerification(email);
      verification.attempts = totalPreviousAttempts; // Preserve previous attempts
      verification.maxAttempts = maxAttempts;
      em.persist(verification);
      await em.flush();

      logger.info({
        email,
        verificationId: verification.id,
        previousAttempts: totalPreviousAttempts,
        attemptsLeft: maxAttempts - totalPreviousAttempts
      }, 'New verification request created with accumulated attempts');

      // ────────────────────────────────────────────────────────────────────
      // Crear notificaciones para todos los admins
      // ────────────────────────────────────────────────────────────────────
      try {
        // Obtener todos los usuarios con rol ADMIN
        const adminUsers = await em.find(User, {
          roles: { $contains: [Role.ADMIN] }
        });

        // Crear una notificación para cada admin
        const personData = person as any;
        for (const admin of adminUsers) {
          await sendNotificationToUser({
            userId: admin.id,
            type: NotificationType.SYSTEM,
            title: 'Nueva solicitud de verificación de usuario',
            message: `${personData.name} (${email}) ha solicitado la verificación de su cuenta.`,
            relatedEntityId: verification.id.toString(),
            relatedEntityType: 'user-verification',
            metadata: {
              userEmail: email,
              userName: personData.name,
              requestedAt: new Date().toISOString(),
            },
          });
        }

        logger.info({
          email,
          verificationId: verification.id,
          adminCount: adminUsers.length
        }, 'Admin notifications created for user verification request');

      } catch (notifError) {
        logger.error({ err: notifError }, 'Error creating admin notifications for user verification request');
        // Don't fail the request if notification fails
      }

      // Enviar email de notificación al usuario
      const emailSent = await emailService.sendVerificationEmail(
        email,
        verification.token,
        (person as any).name
      );

      if (!emailSent) {
        logger.warn({ email }, 'Failed to send verification notification email');
        // Don't fail the request if email cannot be sent
      }

      // Cache the request to prevent spam
      await cacheService.set(
        `user_verification_request:${email}`,
        { requested: true, timestamp: Date.now() },
        15 * 60 // 15 minutes cooldown
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
   * Resends verification request notification
   */
  async resendVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.body;

      // Check resend cooldown
      const cooldownKey = `user_verification_request:${email}`;
      const cooldownData = await cacheService.get(cooldownKey);

      if (cooldownData) {
        return ResponseUtil.error(res, 'Please wait 15 minutes before requesting another verification', 429);
      }

      // Find user's personal information
      const person = await em.findOne('BasePersonEntity', { email });
      if (!person) {
        return ResponseUtil.notFound(res, 'Person', email);
      }

      // Find existing verification
      const verification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (verification && verification.isValid()) {
        // Resend existing notification
        const emailSent = await emailService.sendVerificationEmail(
          email,
          verification.token,
          (person as any).name
        );

        if (emailSent) {
          // Update cooldown
          await cacheService.set(cooldownKey, { requested: true, timestamp: Date.now() }, 15 * 60);

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
   * Gets the verification status of a user by email
   */
  async getVerificationStatus(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.params;

      // Find verifications for this email
      const verifications = await em.find(UserVerification, { email }, {
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
        attempts: latestVerification.attempts,
        maxAttempts: latestVerification.maxAttempts,
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
      const verification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // Cancel verification
      verification.cancel();
      await em.flush();

      // Clear cooldown cache
      await cacheService.delete(`user_verification_request:${email}`);

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
        ? await em.find(UserVerification, { status: statusFilter as UserVerificationStatus }, {
            orderBy: { createdAt: 'DESC' },
            limit: Number(limit),
            offset: (Number(page) - 1) * Number(limit),
          })
        : await em.find(UserVerification, {}, {
            orderBy: { createdAt: 'DESC' },
            limit: Number(limit),
            offset: (Number(page) - 1) * Number(limit),
          });

      const total = statusFilter
        ? await em.count(UserVerification, { status: statusFilter as UserVerificationStatus })
        : await em.count(UserVerification);

      const result = verifications.map((v: any) => v.toDTO());

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
      const verification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
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
      // 3.5. VALIDATION: Verify that email is verified (if required)
      // ────────────────────────────────────────────────────────────────────
      if (env.EMAIL_VERIFICATION_REQUIRED && !user.emailVerified) {
        logger.warn({
          email,
          userId: user.id,
          emailVerified: user.emailVerified
        }, 'Attempt to verify user without verified email');

        return ResponseUtil.error(
          res,
          'User must verify their email address before account verification can be approved',
          403,
          [
            {
              field: 'emailVerified',
              message: 'Email verification is required before user verification',
              code: 'EMAIL_NOT_VERIFIED'
            }
          ]
        );
      }

      // Log if we are in demo mode
      if (!env.EMAIL_VERIFICATION_REQUIRED && !user.emailVerified) {
        logger.info({
          email,
          userId: user.id,
          mode: 'demo'
        }, 'Approving user verification without email verification (demo mode)');
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

        // Automatically cancel the verification
        verification.cancel();
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
      // 6. VALIDATION: Check for duplicate verified user with same email
      // ────────────────────────────────────────────────────────────────────
      const duplicateVerifiedUser = await em.findOne(User, {
        email,
        isVerified: true,
        id: { $ne: user.id }, // Exclude the current user
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
      // 7. APROBAR: Actualizar User.isVerified
      // ────────────────────────────────────────────────────────────────────
      user.isVerified = true;

      // ────────────────────────────────────────────────────────────────────
      // 8. Recalcular profileCompleteness
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
      // 12. Invalidar cache relacionado
      // ────────────────────────────────────────────────────────────────────
      await cacheService.invalidateUserCache(person.dni);
      await cacheService.delete(`user_verification_request:${email}`);

      // ────────────────────────────────────────────────────────────────────
      // 13. Crear notificación para el usuario
      // ────────────────────────────────────────────────────────────────────
      try {
        await sendNotificationToUser({
          userId: user.id,
          type: NotificationType.USER_VERIFICATION_APPROVED,
          title: 'Verificación de usuario aprobada',
          message: `¡Felicitaciones! Tu cuenta ha sido verificada. Ahora puedes solicitar roles especiales y acceder a todas las funcionalidades del sistema.`,
          relatedEntityId: verification.id.toString(),
          relatedEntityType: 'user-verification',
          metadata: {
            email,
            profileCompleteness: user.profileCompleteness,
          },
        });
      } catch (notifError) {
        logger.error({ err: notifError }, 'Error creating notification for user verification approval');
        // Don't fail the request if notification fails
      }

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
   * Rechaza una solicitud de verificación de usuario (admin only)
   *
   * El rechazo incrementa el contador de intentos y permite al usuario
   * corregir su información y volver a solicitar la verificación.
   * Si se superan los intentos máximos, la verificación se marca como expirada.
   */
  async rejectVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email is already validated by Zod schema
      const { email } = req.params;
      const { reason } = req.body; // Motivo opcional del rechazo

      // ────────────────────────────────────────────────────────────────────
      // 1. Find pending verification request
      // ────────────────────────────────────────────────────────────────────
      const verification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // 2. Increment attempts counter (may mark as EXPIRED if max reached)
      // ────────────────────────────────────────────────────────────────────
      verification.incrementAttempts();

      // Si no ha alcanzado el máximo de intentos, marcar como CANCELLED
      // Esto oculta la solicitud del inbox del admin pero mantiene el registro
      if (verification.status !== UserVerificationStatus.EXPIRED) {
        verification.cancel();
      }

      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // 3. Clear cooldown cache to allow new request (only if not expired)
      // ────────────────────────────────────────────────────────────────────
      if (verification.status !== UserVerificationStatus.EXPIRED) {
        await cacheService.delete(`user_verification_request:${email}`);
      }

      // ────────────────────────────────────────────────────────────────────
      // 4. Enviar notificación al usuario
      // ────────────────────────────────────────────────────────────────────
      const person = await em.findOne(BasePersonEntity, { email });
      const user = await em.findOne(User, { email });

      if (user) {
        try {
          await sendNotificationToUser({
            userId: user.id,
            type: NotificationType.USER_VERIFICATION_REJECTED,
            title: 'Verificación de usuario rechazada',
            message: `Tu solicitud de verificación ha sido rechazada.${reason ? ` Motivo: ${reason}` : ''} Puedes corregir tu información y solicitar verificación nuevamente.`,
            relatedEntityId: verification.id.toString(),
            relatedEntityType: 'user-verification',
            metadata: {
              email,
              reason: reason || 'No reason provided',
            },
          });
        } catch (notifError) {
          logger.error({ err: notifError }, 'Error creating notification for user verification rejection');
          // Don't fail the request if notification fails
        }
      }

      // ────────────────────────────────────────────────────────────────────
      // 5. Enviar email de rechazo al usuario
      // ────────────────────────────────────────────────────────────────────
      if (person && emailService.isAvailable()) {
        try {
          const attemptsLeft = verification.maxAttempts - verification.attempts;
          await emailService.sendUserVerificationRejectionEmail(
            email,
            person.name || 'Usuario',
            reason,
            attemptsLeft
          );
          logger.info({ email, attemptsLeft }, 'Rejection email sent successfully');
        } catch (emailError) {
          logger.error({ err: emailError }, 'Error sending rejection email');
          // Don't fail the request if email fails
        }
      }

      logger.info({
        email,
        reason,
        attempts: verification.attempts,
        maxAttempts: verification.maxAttempts,
        status: verification.status
      }, 'User verification rejected by admin');

      return ResponseUtil.success(res, 'User verification rejected successfully', {
        data: verification.toDTO(),
      });

    } catch (error) {
      logger.error({ err: error }, 'Error rejecting user verification');
      return ResponseUtil.internalError(res, 'Error rejecting user verification', error);
    }
  }
}
