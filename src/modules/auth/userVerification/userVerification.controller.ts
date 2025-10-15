// ============================================================================
// USER VERIFICATION CONTROLLER - Controlador para verificación de usuarios
// ============================================================================

import { Request, Response } from 'express';
import { SqlEntityManager } from '@mikro-orm/mysql';
import { orm } from '../../../shared/db/orm.js';
import { ResponseUtil } from '../../../shared/utils/response.util.js';
import { validateQueryParams } from '../../../shared/middleware/validation.middleware.js';
import logger from '../../../shared/utils/logger.js';
import { UserVerification, UserVerificationStatus } from './userVerification.entity.js';
import { emailService } from '../../../shared/services/email.service.js';
import { cacheService } from '../../../shared/services/cache.service.js';
import { User } from '../user/user.entity.js';
import { BasePersonEntity } from '../../../shared/base.person.entity.js';
import { env } from '../../../config/env.js';

/**
 * Controlador para manejar solicitudes de verificación de usuario
 * 
 * Este sistema verifica toda la información del usuario (DNI, nombre, email, 
 * teléfono, dirección) a través de la aprobación manual del administrador.
 */
export class UserVerificationController {

  /**
   * Solicita verificación de usuario con todos sus datos personales
   * 
   * El usuario debe tener información personal completa (BasePersonEntity)
   * antes de poder solicitar la verificación.
   */
  async requestVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // 1. Verificar que el usuario tenga su email verificado
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
      // 2. Verificar que existe información personal del usuario
      // ────────────────────────────────────────────────────────────────────
      const person = await em.findOne('BasePersonEntity', { email });
      if (!person) {
        return ResponseUtil.notFound(res, 'Person', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // 3. Verificar si ya existe una solicitud pendiente reciente
      // ────────────────────────────────────────────────────────────────────
      const existingVerification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (existingVerification) {
        // Si existe y no ha expirado, devolver error
        if (existingVerification.isValid()) {
          return ResponseUtil.conflict(res, 'A verification request is already pending for this email');
        }

        // Si ha expirado, eliminarla
        await em.removeAndFlush(existingVerification);
      }

      // Crear nueva solicitud de verificación
      const verification = new UserVerification(email);
      em.persist(verification);
      await em.flush();

      // Enviar email de notificación al usuario
      const emailSent = await emailService.sendVerificationEmail(
        email,
        verification.token,
        (person as any).name
      );

      if (!emailSent) {
        logger.warn({ email }, 'Failed to send verification notification email');
        // No fallar la solicitud si el email no se puede enviar
      }

      // Cachear la solicitud para evitar spam
      await cacheService.set(
        `user_verification_request:${email}`,
        { requested: true, timestamp: Date.now() },
        15 * 60 // 15 minutos de cooldown
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
   * Verifica el token de verificación (DEPRECATED)
   * 
   * @deprecated Este endpoint se mantiene por compatibilidad pero la verificación
   * debe hacerse manualmente por el admin usando approveVerification
   */
  async verifyEmail(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Token ya está validado por el schema de Zod
      const { token } = req.params;

      // Buscar la solicitud de verificación
      const verification = await em.findOne(UserVerification, { token });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Verification request', token);
      }

      // Verificar que sea válida
      if (!verification.isValid()) {
        if (verification.status === UserVerificationStatus.EXPIRED) {
          return ResponseUtil.error(res, 'Verification token has expired', 400);
        }
        if (verification.status === UserVerificationStatus.VERIFIED) {
          return ResponseUtil.error(res, 'User has already been verified', 400);
        }
        if (verification.status === UserVerificationStatus.CANCELLED) {
          return ResponseUtil.error(res, 'Verification request has been cancelled', 400);
        }
      }

      // Verificar que se pueda hacer el intento
      if (!verification.canAttempt()) {
        return ResponseUtil.error(res, 'Maximum verification attempts exceeded', 400);
      }

      // Marcar como verificada
      verification.markAsVerified();
      await em.flush();

      // Buscar la información personal del usuario para enviar email de bienvenida
      const person = await em.findOne('BasePersonEntity', { email: verification.email });

      if (person) {
        // Enviar email de bienvenida
        await emailService.sendWelcomeEmail(verification.email, (person as any).name);

        // Invalidar cache relacionado con el usuario
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
   * Reenvía notificación de solicitud de verificación
   */
  async resendVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.body;

      // Verificar cooldown de reenvío
      const cooldownKey = `user_verification_request:${email}`;
      const cooldownData = await cacheService.get(cooldownKey);

      if (cooldownData) {
        return ResponseUtil.error(res, 'Please wait 15 minutes before requesting another verification', 429);
      }

      // Buscar información personal del usuario
      const person = await em.findOne('BasePersonEntity', { email });
      if (!person) {
        return ResponseUtil.notFound(res, 'Person', email);
      }

      // Buscar verificación existente
      const verification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (verification && verification.isValid()) {
        // Reenviar notificación existente
        const emailSent = await emailService.sendVerificationEmail(
          email,
          verification.token,
          (person as any).name
        );

        if (emailSent) {
          // Actualizar cooldown
          await cacheService.set(cooldownKey, { requested: true, timestamp: Date.now() }, 15 * 60);

          return ResponseUtil.success(res, 'Verification request resent successfully');
        } else {
          return ResponseUtil.internalError(res, 'Failed to send verification notification');
        }
      } else {
        // Crear nueva verificación
        return this.requestVerification(req, res);
      }

    } catch (error) {
      logger.error({ err: error }, 'Error resending verification request');
      return ResponseUtil.internalError(res, 'Error resending verification request', error);
    }
  }

  /**
   * Obtiene el estado de verificación de un usuario por email
   */
  async getVerificationStatus(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.params;

      // Buscar verificaciones para este email
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
   * Cancela una solicitud de verificación de usuario (admin only)
   */
  async cancelVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.params;

      // Buscar verificación pendiente
      const verification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // Cancelar verificación
      verification.cancel();
      await em.flush();

      // Limpiar cache de cooldown
      await cacheService.delete(`user_verification_request:${email}`);

      return ResponseUtil.success(res, 'User verification request cancelled successfully');

    } catch (error) {
      logger.error({ err: error }, 'Error cancelling user verification');
      return ResponseUtil.internalError(res, 'Error cancelling user verification', error);
    }
  }

  /**
   * Obtiene todas las solicitudes de verificación de usuario (admin only)
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
   * Aprueba una solicitud de verificación de usuario (admin only)
   * 
   * Este proceso verifica toda la información del usuario:
   * - Datos personales completos (DNI, nombre, email, teléfono, dirección)
   * - Email único y no duplicado
   * - DNI único en el sistema
   * 
   * Validaciones automáticas:
   * - Verifica que no exista otro usuario con el mismo email verificado
   * - Verifica que no exista otro usuario con el mismo DNI
   * - Actualiza User.emailVerified = true
   * - Recalcula profileCompleteness del usuario
   */
  async approveVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.params;

      // ────────────────────────────────────────────────────────────────────
      // 1. Buscar la solicitud de verificación pendiente
      // ────────────────────────────────────────────────────────────────────
      const verification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // 2. Buscar el usuario asociado a este email
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
      // 3. VALIDACIÓN: Verificar que el usuario no esté ya verificado
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
      // 3.5. VALIDACIÓN: Verificar que el email esté verificado (si requerido)
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

      // Log si estamos en modo demo
      if (!env.EMAIL_VERIFICATION_REQUIRED && !user.emailVerified) {
        logger.info({
          email,
          userId: user.id,
          mode: 'demo'
        }, 'Approving user verification without email verification (demo mode)');
      }

      // ────────────────────────────────────────────────────────────────────
      // 4. Buscar información personal del usuario
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
      // 5. VALIDACIÓN CRÍTICA: Verificar DNI duplicado
      // ────────────────────────────────────────────────────────────────────
      const duplicateDNI = await em.findOne(BasePersonEntity, {
        dni: person.dni,
        email: { $ne: email }, // Excluir el email actual
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
        
        // Cancelar la verificación automáticamente
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
      // 6. VALIDACIÓN: Verificar usuario duplicado verificado con mismo email
      // ────────────────────────────────────────────────────────────────────
      const duplicateVerifiedUser = await em.findOne(User, {
        email,
        isVerified: true,
        id: { $ne: user.id }, // Excluir el usuario actual
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
      // 9. Marcar verificación como completada
      // ────────────────────────────────────────────────────────────────────
      verification.markAsVerified();

      // ────────────────────────────────────────────────────────────────────
      // 10. Persistir todos los cambios
      // ────────────────────────────────────────────────────────────────────
      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // 11. Enviar email de bienvenida al usuario
      // ────────────────────────────────────────────────────────────────────
      await emailService.sendWelcomeEmail(email, person.name);

      // ────────────────────────────────────────────────────────────────────
      // 12. Invalidar cache relacionado
      // ────────────────────────────────────────────────────────────────────
      await cacheService.invalidateUserCache(person.dni);
      await cacheService.delete(`user_verification_request:${email}`);

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
   * El rechazo permite al usuario corregir su información y volver a solicitar
   * la verificación. El cooldown se elimina para permitir el reintento inmediato.
   */
  async rejectVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.params;
      const { reason } = req.body; // Motivo opcional del rechazo

      // ────────────────────────────────────────────────────────────────────
      // 1. Buscar la solicitud de verificación pendiente
      // ────────────────────────────────────────────────────────────────────
      const verification = await em.findOne(UserVerification, {
        email,
        status: UserVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // 2. Marcar verificación como cancelada
      // ────────────────────────────────────────────────────────────────────
      verification.cancel();
      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // 3. Limpiar cache de cooldown para permitir nueva solicitud
      // ────────────────────────────────────────────────────────────────────
      await cacheService.delete(`user_verification_request:${email}`);

      // ────────────────────────────────────────────────────────────────────
      // 4. (Opcional) Enviar email de notificación de rechazo al usuario
      // ────────────────────────────────────────────────────────────────────
      const person = await em.findOne(BasePersonEntity, { email });
      if (person && reason) {
        // TODO: Implementar emailService.sendRejectionEmail si se necesita
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
