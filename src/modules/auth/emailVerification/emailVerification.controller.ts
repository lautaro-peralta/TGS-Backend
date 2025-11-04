// ============================================================================
// EMAIL VERIFICATION CONTROLLER - Controlador para verificación de emails
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
 * Controlador para manejar verificación automática de email
 * 
 * Este sistema es el clásico "click en el link del email" para verificar
 * que el usuario tiene acceso al email proporcionado.
 * 
 * Es DIFERENTE de UserVerification (verificación manual por admin).
 */
export class EmailVerificationController {

  /**
   * Solicita verificación de usuario con todos sus datos personales
   * 
   * El usuario debe tener información personal completa (BasePersonEntity)
   * antes de poder solicitar la verificación.
   * 
   * VALIDACIONES DE SEGURIDAD:
   * - Usuario debe estar autenticado
   * - Solo puede solicitar verificación para su propio email
   * - Solo usuarios con emailVerified: false pueden solicitar
   */
  async requestVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // VALIDACIÓN: Usuario debe estar autenticado
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
      // VALIDACIÓN: Solo puede solicitar verificación para su propio email
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
      // VALIDACIÓN: Solo usuarios con emailVerified: false pueden solicitar
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

      // Verificar que existe información personal del usuario
      const person = await em.findOne('BasePersonEntity', { email });
      if (!person) {
        return ResponseUtil.notFound(res, 'Person', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // VALIDACIÓN: Usuarios con roles no-base ya deberían estar verificados
      // ────────────────────────────────────────────────────────────────────
        // Si el usuario tiene roles diferentes a USER, ya debería estar verificado
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

      // Verificar si ya existe una solicitud pendiente
      const existingVerification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (existingVerification) {
        // Si existe y no ha expirado, verificar si han pasado 2 minutos
        if (existingVerification.isValid()) {
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
          
          if (existingVerification.createdAt > twoMinutesAgo) {
            // Menos de 2 minutos, devolver error con tiempo restante
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
            // Han pasado 2 minutos, marcar la anterior como expirada
            logger.info({ 
              email, 
              previousVerificationId: existingVerification.id,
              createdAt: existingVerification.createdAt 
            }, 'Previous verification request expired due to new request after 2 minutes');
            
            existingVerification.markAsExpired();
            await em.flush();
          }
        } else {
          // Si ya había expirado, eliminarla
          await em.removeAndFlush(existingVerification);
        }
      }

      // Crear nueva solicitud de verificación
      const verification = new EmailVerification(email);
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

      // Cachear la solicitud para evitar spam (2 minutos de cooldown)
      await cacheService.set(
        `verification_request:${email}`,
        { requested: true, timestamp: Date.now() },
        2 * 60 // 2 minutos de cooldown
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
   * Verifica el token de verificación (flujo oficial automático por enlace)
   * 
   * Este endpoint confirma la verificación del email utilizando el token
   * enviado por correo. No requiere intervención de administradores.
   */
  async verifyEmail(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Token ya está validado por el schema de Zod
      const { token } = req.params;

      // Buscar la solicitud de verificación
      const verification = await em.findOne(EmailVerification, { token });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Verification request', token);
      }

      // Verificar que sea válida
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

      // Marcar como verificada
      verification.markAsVerified();

      // ────────────────────────────────────────────────────────────────────
      // Actualizar User.emailVerified = true
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
   * 
   * VALIDACIONES DE SEGURIDAD:
   * - Usuario debe estar autenticado
   * - Solo puede reenviar verificación para su propio email
   */
  async resendVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // VALIDACIÓN: Usuario debe estar autenticado
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
      // VALIDACIÓN: Solo puede reenviar verificación para su propio email
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

      // Verificar cooldown de reenvío (2 minutos)
      const cooldownKey = `verification_request:${email}`;
      const cooldownData = await cacheService.get(cooldownKey);

      if (cooldownData) {
        return ResponseUtil.error(res, 'Please wait 2 minutes before requesting another verification', 429);
      }

      // Buscar información personal del usuario
      const person = await em.findOne('BasePersonEntity', { email });
      if (!person) {
        return ResponseUtil.notFound(res, 'Person', email);
      }

      // Buscar verificación existente
      const verification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (verification && verification.isValid()) {
        // Reenviar notificación existente
        const emailSent = await emailService.sendVerificationEmail(
          email,
          verification.token,
          (person as any).name
        );

        if (emailSent) {
          // Actualizar cooldown (2 minutos)
          await cacheService.set(cooldownKey, { requested: true, timestamp: Date.now() }, 2 * 60);

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
   * Reenvía verificación de email para usuarios no verificados (sin autenticación)
   * 
   * Este endpoint permite a usuarios que se registraron pero no han verificado su email
   * solicitar un nuevo email de verificación usando su email o username.
   *
   * VALIDACIONES:
   * - Email o username debe existir en la base de datos
   * - Usuario no debe tener email verificado
   * - Cooldown de 2 minutos entre reenvíos
   */
  async resendVerificationForUnverified(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod (puede ser email o username)
      const { email: emailOrUsername } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // VALIDACIÓN: Usuario debe existir en la base de datos
      // Buscar por email O username para mayor flexibilidad
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, {
        $or: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      });

      if (!user) {
        return ResponseUtil.notFound(res, 'User', emailOrUsername);
      }

      // Usar el email real del usuario (importante cuando se provee username)
      const email = user.email;

      // ────────────────────────────────────────────────────────────────────
      // VALIDACIÓN: Usuario no debe tener email verificado
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
      // VALIDACIÓN: Verificar cooldown de reenvío (2 minutos)
      // ────────────────────────────────────────────────────────────────────
      const cooldownKey = `verification_request:${email}`;
      const cooldownData = await cacheService.get(cooldownKey);

      if (cooldownData) {
        return ResponseUtil.error(res, 'Please wait 2 minutes before requesting another verification', 429);
      }

      // ────────────────────────────────────────────────────────────────────
      // Buscar verificación existente
      // ────────────────────────────────────────────────────────────────────
      const existingVerification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (existingVerification && existingVerification.isValid()) {
        // Reenviar notificación existente
        const emailSent = await emailService.sendVerificationEmail(
          email,
          existingVerification.token,
          user.username // Usar username como nombre temporal
        );

        if (emailSent) {
          // Actualizar cooldown (2 minutos)
          await cacheService.set(cooldownKey, { requested: true, timestamp: Date.now() }, 2 * 60);

          return ResponseUtil.success(res, 'Verification email resent successfully');
        } else {
          return ResponseUtil.internalError(res, 'Failed to send verification notification');
        }
      } else {
        // Crear nueva verificación
        const verification = new EmailVerification(email);
        em.persist(verification);
        await em.flush();

        // Enviar email de verificación
        const emailSent = await emailService.sendVerificationEmail(
          email,
          verification.token,
          user.username
        );

        if (emailSent) {
          // Cachear la solicitud para evitar spam (2 minutos de cooldown)
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
   * Obtiene el estado de verificación de un usuario por email
   */
  async getVerificationStatus(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.params;

      // Buscar verificaciones para este email
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
   * Cancela una solicitud de verificación de usuario (admin only)
   */
  async cancelVerification(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // Email ya está validado por el schema de Zod
      const { email } = req.params;

      // Buscar verificación pendiente
      const verification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // Marcar como expirada
      verification.markAsExpired();
      await em.flush();

      // Limpiar cache de cooldown
      await cacheService.delete(`verification_request:${email}`);

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
      const verification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
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
        
        // Marcar como expirada
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
      const verification = await em.findOne(EmailVerification, {
        email,
        status: EmailVerificationStatus.PENDING,
      });

      if (!verification) {
        return ResponseUtil.notFound(res, 'Pending verification request', email);
      }

      // ────────────────────────────────────────────────────────────────────
      // 2. Marcar verificación como expirada
      // ────────────────────────────────────────────────────────────────────
      verification.markAsExpired();
      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // 3. Limpiar cache de cooldown para permitir nueva solicitud
      // ────────────────────────────────────────────────────────────────────
      await cacheService.delete(`verification_request:${email}`);

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
