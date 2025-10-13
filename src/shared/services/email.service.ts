// ============================================================================
// EMAIL SERVICE - Servicio de envío de emails con plantillas profesionales
// ============================================================================

import nodemailer, { Transporter } from 'nodemailer';
import { z } from 'zod';
import logger from '../utils/logger.js';

/**
 * Configuración de envío de emails
 */
const emailConfigSchema = z.object({
  host: z.string().default('smtp.gmail.com'),
  port: z.coerce.number().default(587),
  secure: z.coerce.boolean().default(false),
  auth: z.object({
    user: z.string(),
    pass: z.string(),
  }),
  from: z.string().email().default('noreply@tgs-system.com'),
});

type EmailConfig = z.infer<typeof emailConfigSchema>;

/**
 * Plantillas de email disponibles
 */
export enum EmailTemplate {
  VERIFICATION = 'verification',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  ADMIN_NOTIFICATION = 'admin_notification',
}

/**
 * Servicio de envío de emails con soporte para plantillas y configuración profesional
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private isEnabled: boolean = false;

  /**
   * Inicializa el servicio de email
   */
  async initialize(config?: Partial<EmailConfig>): Promise<void> {
    try {
      // Usar configuración proporcionada o variables de entorno
      const emailConfig = {
        host: config?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: config?.port || Number(process.env.SMTP_PORT) || 587,
        secure: config?.secure || (process.env.SMTP_SECURE === 'true') || false,
        auth: {
          user: config?.auth?.user || process.env.SMTP_USER || '',
          pass: config?.auth?.pass || process.env.SMTP_PASS || '',
        },
        from: config?.from || process.env.SMTP_FROM || 'noreply@tgs-system.com',
      };

      // Validar configuración
      this.config = emailConfigSchema.parse(emailConfig);

      // Crear transporter solo si tenemos credenciales válidas
      if (this.config.auth.user && this.config.auth.pass) {
        this.transporter = nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: this.config.auth,
          tls: {
            rejectUnauthorized: false, // Para desarrollo
          },
        });

        // Verificar conexión (opcional en desarrollo)
        try {
          await this.transporter.verify();
          this.isEnabled = true;
          logger.info('Email service initialized and verified successfully');
        } catch (verifyError) {
          // En desarrollo, continuar sin fallar si la verificación falla
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Email service configured but verification failed (continuing in dev mode)');
            this.isEnabled = true; // Permitir continuar en desarrollo
          } else {
            logger.error({ err: verifyError }, 'Email service verification failed');
            this.isEnabled = false;
            throw verifyError; // Fallar en producción si no se puede verificar
          }
        }
      } else {
        logger.warn('Email service disabled - missing SMTP credentials (this is normal in development)');
        this.isEnabled = false;
      }

    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize email service');
      this.isEnabled = false;
      
      // Solo lanzar error en producción
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  /**
   * Envía un email usando una plantilla
   */
  async sendEmail(
    to: string,
    template: EmailTemplate,
    data: Record<string, any>,
    options?: {
      subject?: string;
      from?: string;
    }
  ): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      logger.warn({ to, template }, 'Email service not available');
      return false;
    }

    try {
      const templateData = await this.getTemplateData(template, data);
      const subject = options?.subject || templateData.subject;

      const mailOptions = {
        from: options?.from || this.config!.from,
        to,
        subject,
        html: templateData.html,
        text: templateData.text, // Versión de texto plano
      };

      const result = await this.transporter!.sendMail(mailOptions);

      logger.info({
        to,
        template,
        subject,
        messageId: result.messageId,
      }, 'Email sent successfully');

      return true;

    } catch (error) {
      logger.error({
        err: error,
        to,
        template,
      }, 'Failed to send email');

      return false;
    }
  }

  /**
   * Envía email de verificación de cuenta
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    userName?: string
  ): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    return this.sendEmail(email, EmailTemplate.VERIFICATION, {
      userName: userName || 'Usuario',
      verificationUrl,
      token: verificationToken,
      expiresIn: '24 horas',
    });
  }

  /**
   * Envía email de bienvenida después de verificación
   */
  async sendWelcomeEmail(
    email: string,
    userName: string
  ): Promise<boolean> {
    return this.sendEmail(email, EmailTemplate.WELCOME, {
      userName,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
    });
  }

  /**
   * Envía notificación a administradores sobre nueva verificación
   */
  async sendAdminNotification(
    adminEmail: string,
    clientEmail: string,
    clientName: string
  ): Promise<boolean> {
    return this.sendEmail(adminEmail, EmailTemplate.ADMIN_NOTIFICATION, {
      clientName,
      clientEmail,
      adminPanelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/verifications`,
    }, {
      subject: `Nueva solicitud de verificación de email - ${clientName}`,
    });
  }

  /**
   * Obtiene los datos de plantilla para un tipo específico
   */
  private async getTemplateData(
    template: EmailTemplate,
    data: Record<string, any>
  ): Promise<{ subject: string; html: string; text: string }> {
    switch (template) {
      case EmailTemplate.VERIFICATION:
        return this.getVerificationTemplate(data);

      case EmailTemplate.WELCOME:
        return this.getWelcomeTemplate(data);

      case EmailTemplate.ADMIN_NOTIFICATION:
        return this.getAdminNotificationTemplate(data);

      default:
        throw new Error(`Unknown email template: ${template}`);
    }
  }

  /**
   * Plantilla de verificación de email
   */
  private getVerificationTemplate(data: any) {
    const subject = 'Verifica tu dirección de email - TGS System';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verificación de Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 5px; }
          .button {
            background: #2563eb;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 20px 0;
          }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TGS System</h1>
            <p>Verificación de Dirección de Email</p>
          </div>

          <div class="content">
            <h2>¡Hola ${data.userName}!</h2>

            <p>Gracias por registrarte en nuestro sistema. Para completar tu registro y acceder a todas las funcionalidades, necesitamos verificar tu dirección de email.</p>

            <p>Haz clic en el siguiente botón para verificar tu email:</p>

            <a href="${data.verificationUrl}" class="button">Verificar Email</a>

            <p><strong>Enlace de verificación:</strong></p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 3px;">
              ${data.verificationUrl}
            </p>

            <p><strong>Importante:</strong></p>
            <ul>
              <li>Este enlace expirará en ${data.expiresIn}</li>
              <li>Si no solicitaste esta verificación, puedes ignorar este email</li>
              <li>No compartas este enlace con nadie</li>
            </ul>

            <p>Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.</p>

            <p>¡Gracias por elegir TGS System!</p>
          </div>

          <div class="footer">
            <p>Este email fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} TGS System. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ¡Hola ${data.userName}!

      Gracias por registrarte en TGS System. Para completar tu registro, necesitamos verificar tu dirección de email.

      Haz clic en el siguiente enlace para verificar tu email:
      ${data.verificationUrl}

      Este enlace expirará en ${data.expiresIn}.

      Si no solicitaste esta verificación, puedes ignorar este email.

      ¡Gracias por elegir TGS System!
    `;

    return { subject, html, text };
  }

  /**
   * Plantilla de bienvenida
   */
  private getWelcomeTemplate(data: any) {
    const subject = '¡Bienvenido a TGS System!';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bienvenido a TGS System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 5px; }
          .button {
            background: #10b981;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 20px 0;
          }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a TGS System!</h1>
          </div>

          <div class="content">
            <h2>¡Hola ${data.userName}!</h2>

            <p>¡Felicitaciones! Tu cuenta ha sido verificada exitosamente y ya puedes acceder a todas las funcionalidades de TGS System.</p>

            <p>¿Qué puedes hacer ahora?</p>
            <ul>
              <li>Explorar nuestro catálogo de productos</li>
              <li>Realizar consultas y búsquedas avanzadas</li>
              <li>Acceder a información detallada de autoridades y zonas</li>
              <li>Participar en el sistema de decisiones estratégicas</li>
            </ul>

            <a href="${data.loginUrl}" class="button">Iniciar Sesión</a>

            <p>Si tienes alguna pregunta o necesitas ayuda, nuestro equipo de soporte está aquí para asistirte.</p>

            <p>¡Disfruta de tu experiencia en TGS System!</p>
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TGS System. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ¡Hola ${data.userName}!

      ¡Felicitaciones! Tu cuenta ha sido verificada exitosamente.

      Ya puedes acceder a todas las funcionalidades de TGS System:

      - Explorar nuestro catálogo de productos
      - Realizar consultas y búsquedas avanzadas
      - Acceder a información detallada
      - Participar en decisiones estratégicas

      Inicia sesión en: ${data.loginUrl}

      ¡Disfruta de tu experiencia en TGS System!
    `;

    return { subject, html, text };
  }

  /**
   * Plantilla de notificación para administradores
   */
  private getAdminNotificationTemplate(data: any) {
    const subject = `Nueva solicitud de verificación - ${data.clientName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nueva Solicitud de Verificación</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 5px; }
          .info-box {
            background: #e5e7eb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .button {
            background: #f59e0b;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 20px 0;
          }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Nueva Solicitud de Verificación</h1>
          </div>

          <div class="content">
            <h2>Notificación de Administrador</h2>

            <p>Un cliente ha solicitado verificación de su dirección de email:</p>

            <div class="info-box">
              <p><strong>Cliente:</strong> ${data.clientName}</p>
              <p><strong>Email:</strong> ${data.clientEmail}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>Como administrador, puedes revisar y gestionar esta solicitud en el panel administrativo.</p>

            <a href="${data.adminPanelUrl}" class="button">Revisar Solicitudes</a>

            <p><strong>Información importante:</strong></p>
            <ul>
              <li>El cliente ya tiene información personal registrada</li>
              <li>La solicitud incluye un token de verificación único</li>
              <li>El token expira en 24 horas</li>
              <li>Se permiten máximo 3 intentos de verificación</li>
            </ul>

            <p>Esta notificación se envió automáticamente cuando el cliente solicitó verificación de email.</p>
          </div>

          <div class="footer">
            <p>Sistema de Notificaciones TGS - ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Nueva Solicitud de Verificación

      Cliente: ${data.clientName}
      Email: ${data.clientEmail}
      Fecha: ${new Date().toLocaleString()}

      El cliente ya tiene información personal registrada y ha solicitado verificación de email.

      Revisa las solicitudes pendientes en: ${data.adminPanelUrl}

      Información importante:
      - Token único de verificación
      - Expira en 24 horas
      - Máximo 3 intentos permitidos

      Esta notificación se envió automáticamente.
    `;

    return { subject, html, text };
  }

  /**
   * Verifica si el servicio de email está disponible
   */
  isAvailable(): boolean {
    return this.isEnabled && this.transporter !== null;
  }

  /**
   * Obtiene estadísticas del servicio de email
   */
  getStats() {
    return {
      enabled: this.isEnabled,
      configured: this.config !== null,
      hasCredentials: !!(this.config?.auth.user && this.config?.auth.pass),
    };
  }
}

// Instancia singleton
export const emailService = new EmailService();
