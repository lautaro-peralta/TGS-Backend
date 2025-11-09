// ============================================================================
// EMAIL SERVICE - Email sending service with professional templates
// ============================================================================

import nodemailer, { Transporter } from 'nodemailer';
import { z } from 'zod';
import logger from '../utils/logger.js';

// SendGrid for production - We use Web API (more efficient than SMTP)
import sgMail from '@sendgrid/mail';

/**
 * Email sending configuration
 */
const emailConfigSchema = z.object({
  // SMTP configuration (for development with Mailtrap)
  host: z.string().default('smtp.gmail.com'),
  port: z.coerce.number().default(587),
  secure: z.coerce.boolean().default(false),
  auth: z.object({
    user: z.string().optional().default(''),
    pass: z.string().optional().default(''),
  }),
  from: z.string().email().default('noreply@tgs-system.com'),

  // SendGrid configuration (for production)
  sendgridApiKey: z.string().optional(),
  sendgridFrom: z.string().email().optional(),
});

type EmailConfig = z.infer<typeof emailConfigSchema>;

/**
 * Available email templates
 */
export enum EmailTemplate {
  VERIFICATION = 'verification',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  ADMIN_NOTIFICATION = 'admin_notification',
}

/**
 * Email sending service with support for templates and professional configuration
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private isEnabled: boolean = false;
  private useSendGrid: boolean = false;

  /**
   * Initializes the email service
   */
  async initialize(config?: Partial<EmailConfig>): Promise<void> {
    try {
      // Use provided configuration or environment variables
      const emailConfig = {
        host: config?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: config?.port || Number(process.env.SMTP_PORT) || 587,
        secure: config?.secure || (process.env.SMTP_SECURE === 'true') || false,
        auth: {
          user: config?.auth?.user || process.env.SMTP_USER || '',
          pass: config?.auth?.pass || process.env.SMTP_PASS || '',
        },
        from: config?.from || process.env.SMTP_FROM || 'noreply@tgs-system.com',
        sendgridApiKey: config?.sendgridApiKey || process.env.SENDGRID_API_KEY,
        sendgridFrom: config?.sendgridFrom || process.env.SENDGRID_FROM,
      };

      // Validate configuration
      this.config = emailConfigSchema.parse(emailConfig);

      // Determine whether to use SendGrid (production with API key) or SMTP (development)
      this.useSendGrid = !!(
        process.env.NODE_ENV === 'production' &&
        this.config.sendgridApiKey &&
        this.config.sendgridFrom
      );

      // Initialize the appropriate email provider
      if (this.useSendGrid) {
        // Configure SendGrid for production
        sgMail.setApiKey(this.config.sendgridApiKey!);
        this.isEnabled = true;
        logger.info('SendGrid email service initialized for production');
      } else if (this.config.auth.user && this.config.auth.pass) {
        // Configure SMTP (Mailtrap for development)
        this.transporter = nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: this.config.auth,
          tls: {
            rejectUnauthorized: false, // For development
          },
        });

        // Verify connection (optional in development)
        try {
          await this.transporter.verify();
          this.isEnabled = true;

          // Different log if EMAIL_VERIFICATION_REQUIRED is disabled
          const verificationRequired = process.env.EMAIL_VERIFICATION_REQUIRED !== 'false';
          if (verificationRequired) {
            logger.info('SMTP email service initialized and verified successfully');
          } else {
            logger.info('SMTP email service initialized (demo mode - verification emails will be sent but not required)');
          }
        } catch (verifyError) {
          // In development, continue without failing if verification fails
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Email service configured but verification failed (continuing in dev mode)');
            this.isEnabled = true; // Allow to continue in development
          } else {
            logger.error({ err: verifyError }, 'Email service verification failed');
            this.isEnabled = false;
            throw verifyError; // Fail in production if cannot verify
          }
        }
      } else {
        logger.warn('Email service disabled - missing credentials (this is normal in development)');
        this.isEnabled = false;
      }

    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize email service');
      this.isEnabled = false;
      
      // Only throw error in production
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  /**
   * Sends an email using a template
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
    if (!this.isEnabled) {
      logger.warn({ to, template }, 'Email service not available');
      return false;
    }

    try {
      const templateData = await this.getTemplateData(template, data);
      const subject = options?.subject || templateData.subject;
      const from = options?.from || (this.useSendGrid ? this.config!.sendgridFrom! : this.config!.from);

      if (this.useSendGrid) {
        // Use SendGrid for production
        const msg = {
          to,
          from,
          subject,
          html: templateData.html,
          text: templateData.text,
        };

        await sgMail.send(msg);

        logger.info({
          to,
          template,
          subject,
          provider: 'SendGrid',
        }, 'Email sent successfully via SendGrid');

        return true;

      } else if (this.transporter) {
        // Use SMTP for development
        const mailOptions = {
          from,
          to,
          subject,
          html: templateData.html,
          text: templateData.text, // Plain text version
        };

        const result = await this.transporter.sendMail(mailOptions);

        logger.info({
          to,
          template,
          subject,
          messageId: result.messageId,
          provider: 'SMTP',
        }, 'Email sent successfully via SMTP');

        return true;

      } else {
        logger.error({ to, template }, 'No email provider available');
        return false;
      }

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
   * Sends account verification email
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    userName?: string
  ): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/verify-email/${encodeURIComponent(verificationToken)}`;

    return this.sendEmail(email, EmailTemplate.VERIFICATION, {
      userName: userName || 'Usuario',
      verificationUrl,
      token: verificationToken,
      expiresIn: '15 minutes', // Updated from 24 hours
    });
  }

  /**
   * Sends welcome email after verification
   */
  async sendWelcomeEmail(
    email: string,
    userName: string
  ): Promise<boolean> {
    return this.sendEmail(email, EmailTemplate.WELCOME, {
      userName,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:4200'}`,
    });
  }

  /**
   * Sends notification to administrators about new verification
   */
  async sendAdminNotification(
    adminEmail: string,
    clientEmail: string,
    clientName: string
  ): Promise<boolean> {
    return this.sendEmail(adminEmail, EmailTemplate.ADMIN_NOTIFICATION, {
      clientName,
      clientEmail,
      adminPanelUrl: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/admin/verifications`,
    }, {
      subject: `Nueva solicitud de verificación de email - ${clientName}`,
    });
  }

  /**
   * Gets template data for a specific type
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
   * Email verification template
   */
  private getVerificationTemplate(data: any) {
    const subject = 'Verifica tu dirección de email - GarrSYS';

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación de Email</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #e5e7eb;
            background: linear-gradient(135deg, #0b0e11 0%, #11161b 100%);
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, rgba(17, 22, 27, 0.95) 0%, rgba(15, 20, 25, 0.95) 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(195, 164, 98, 0.2);
            border: 1px solid rgba(195, 164, 98, 0.15);
          }
          .header {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 2px solid rgba(195, 164, 98, 0.2);
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
            animation: glow 8s ease-in-out infinite;
          }
          @keyframes glow {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
            50% { transform: translate(10px, 10px) scale(1.1); opacity: 0.8; }
          }
          .logo {
            font-family: 'Cormorant Garamond', serif;
            font-size: 42px;
            font-weight: 700;
            color: #c3a462;
            margin-bottom: 8px;
            position: relative;
            letter-spacing: 2px;
            text-shadow: 0 2px 20px rgba(195, 164, 98, 0.3);
          }
          .subtitle {
            font-size: 16px;
            color: #cbd5e1;
            font-weight: 500;
            position: relative;
            letter-spacing: 0.5px;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #efe9dd;
            margin-bottom: 20px;
          }
          .text {
            color: #cbd5e1;
            margin-bottom: 20px;
            font-size: 15px;
            line-height: 1.7;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.4);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
          }
          .button:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.6);
            transform: translateY(-2px);
          }
          .url-box {
            background: rgba(15, 20, 25, 0.8);
            border: 1px solid rgba(195, 164, 98, 0.2);
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            word-break: break-all;
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            font-size: 13px;
            color: #93c5fd;
            line-height: 1.6;
          }
          .important-title {
            font-weight: 600;
            color: #efe9dd;
            margin-top: 30px;
            margin-bottom: 12px;
            font-size: 16px;
          }
          .important-list {
            list-style: none;
            padding: 0;
          }
          .important-list li {
            padding: 10px 0 10px 28px;
            position: relative;
            color: #cbd5e1;
            font-size: 14px;
          }
          .important-list li::before {
            content: '→';
            position: absolute;
            left: 8px;
            color: #3b82f6;
            font-weight: 700;
          }
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(195, 164, 98, 0.3) 50%, transparent 100%);
            margin: 30px 0;
          }
          .footer {
            background: rgba(11, 14, 17, 0.6);
            padding: 30px;
            text-align: center;
            border-top: 1px solid rgba(195, 164, 98, 0.15);
          }
          .footer-text {
            color: #9aa0a6;
            font-size: 13px;
            margin-bottom: 20px;
          }
          .academic-info {
            padding-top: 20px;
            border-top: 1px solid rgba(195, 164, 98, 0.15);
          }
          .academic-title {
            font-family: 'Cormorant Garamond', serif;
            font-weight: 700;
            color: #c3a462;
            font-size: 16px;
            margin-bottom: 8px;
          }
          .academic-text {
            font-size: 12px;
            color: #9aa0a6;
            line-height: 1.6;
          }
          @media only screen and (max-width: 600px) {
            .container { border-radius: 0; margin: -20px; }
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
            .logo { font-size: 36px; }
            .greeting { font-size: 22px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">GarrSYS</div>
            <div class="subtitle">Verificación de Dirección de Email</div>
          </div>

          <div class="content">
            <div class="greeting">¡Hola ${data.userName}!</div>

            <p class="text">Gracias por registrarte en nuestro sistema. Para completar tu registro y acceder a todas las funcionalidades, necesitamos verificar tu dirección de email.</p>

            <p class="text">Haz clic en el siguiente botón para verificar tu email:</p>

            <div class="button-container">
              <a href="${data.verificationUrl}" class="button">Verificar Email</a>
            </div>

            <p class="important-title">Enlace de verificación:</p>
            <div class="url-box">${data.verificationUrl}</div>

            <div class="divider"></div>

            <p class="important-title">Información importante:</p>
            <ul class="important-list">
              <li>Este enlace expirará en ${data.expiresIn}</li>
              <li>Si no solicitaste esta verificación, puedes ignorar este email</li>
              <li>No compartas este enlace con nadie</li>
            </ul>

            <div class="divider"></div>

            <p class="text">Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.</p>

            <p class="text" style="font-weight: 600; color: #efe9dd;">¡Gracias por elegir GarrSYS!</p>
          </div>

          <div class="footer">
            <p class="footer-text">Este email fue enviado automáticamente. Por favor, no respondas a este mensaje.</p>
            <div class="academic-info">
              <div class="academic-title">GarrSYS</div>
              <div class="academic-text">
                Proyecto académico desarrollado en UTN – Facultad Regional Rosario<br>
                Zeballos 1341, Rosario, Santa Fe, Argentina
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ¡Hola ${data.userName}!

      Gracias por registrarte en GarrSYS. Para completar tu registro, necesitamos verificar tu dirección de email.

      Haz clic en el siguiente enlace para verificar tu email:
      ${data.verificationUrl}

      Este enlace expirará en ${data.expiresIn}.

      Si no solicitaste esta verificación, puedes ignorar este email.

      ¡Gracias por elegir GarrSYS!

      ---
      GarrSYS
      Proyecto académico desarrollado en UTN – Facultad Regional Rosario
      Zeballos 1341, Rosario, Santa Fe, Argentina
    `;

    return { subject, html, text };
  }

  /**
   * Welcome template
   */
  private getWelcomeTemplate(data: any) {
    const subject = '¡Bienvenido a GarrSYS!';

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a GarrSYS</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #e5e7eb;
            background: linear-gradient(135deg, #0b0e11 0%, #11161b 100%);
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, rgba(17, 22, 27, 0.95) 0%, rgba(15, 20, 25, 0.95) 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(195, 164, 98, 0.2);
            border: 1px solid rgba(195, 164, 98, 0.15);
          }
          .header {
            background: linear-gradient(135deg, #1e3a32 0%, #0f1f1a 100%);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 2px solid rgba(63, 125, 99, 0.3);
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(63, 125, 99, 0.15) 0%, transparent 70%);
            animation: glow 8s ease-in-out infinite;
          }
          @keyframes glow {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
            50% { transform: translate(10px, 10px) scale(1.1); opacity: 0.8; }
          }
          .logo {
            font-family: 'Cormorant Garamond', serif;
            font-size: 42px;
            font-weight: 700;
            color: #c3a462;
            margin-bottom: 8px;
            position: relative;
            letter-spacing: 2px;
            text-shadow: 0 2px 20px rgba(195, 164, 98, 0.3);
          }
          .subtitle {
            font-size: 18px;
            color: #a7f3d0;
            font-weight: 600;
            position: relative;
            letter-spacing: 0.5px;
          }
          .celebration {
            font-size: 32px;
            margin-bottom: 8px;
            display: inline-block;
            animation: bounce 2s ease-in-out infinite;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #efe9dd;
            margin-bottom: 20px;
          }
          .text {
            color: #cbd5e1;
            margin-bottom: 20px;
            font-size: 15px;
            line-height: 1.7;
          }
          .success-message {
            background: linear-gradient(135deg, rgba(63, 125, 99, 0.15) 0%, rgba(52, 211, 153, 0.1) 100%);
            border: 1px solid rgba(63, 125, 99, 0.3);
            border-left: 4px solid #3f7d63;
            padding: 20px;
            border-radius: 10px;
            margin: 25px 0;
          }
          .success-message p {
            color: #a7f3d0;
            font-weight: 500;
            margin: 0;
          }
          .features-title {
            font-weight: 600;
            color: #efe9dd;
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 17px;
          }
          .features-list {
            list-style: none;
            padding: 0;
            margin-bottom: 30px;
          }
          .features-list li {
            padding: 12px 0 12px 32px;
            position: relative;
            color: #cbd5e1;
            font-size: 15px;
            line-height: 1.6;
          }
          .features-list li::before {
            content: '✓';
            position: absolute;
            left: 8px;
            color: #3f7d63;
            font-weight: 700;
            font-size: 18px;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #3f7d63 0%, #2d5a47 100%);
            color: #ffffff;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 10px 30px rgba(63, 125, 99, 0.3), 0 0 0 1px rgba(63, 125, 99, 0.4);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
          }
          .button:hover {
            background: linear-gradient(135deg, #2d5a47 0%, #1f3d31 100%);
            box-shadow: 0 15px 40px rgba(63, 125, 99, 0.4), 0 0 0 1px rgba(63, 125, 99, 0.6);
            transform: translateY(-2px);
          }
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(195, 164, 98, 0.3) 50%, transparent 100%);
            margin: 30px 0;
          }
          .footer {
            background: rgba(11, 14, 17, 0.6);
            padding: 30px;
            text-align: center;
            border-top: 1px solid rgba(195, 164, 98, 0.15);
          }
          .footer-text {
            color: #9aa0a6;
            font-size: 13px;
            margin-bottom: 20px;
          }
          .academic-info {
            padding-top: 20px;
            border-top: 1px solid rgba(195, 164, 98, 0.15);
          }
          .academic-title {
            font-family: 'Cormorant Garamond', serif;
            font-weight: 700;
            color: #c3a462;
            font-size: 16px;
            margin-bottom: 8px;
          }
          .academic-text {
            font-size: 12px;
            color: #9aa0a6;
            line-height: 1.6;
          }
          @media only screen and (max-width: 600px) {
            .container { border-radius: 0; margin: -20px; }
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
            .logo { font-size: 36px; }
            .greeting { font-size: 22px; }
            .celebration { font-size: 28px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="celebration">🎉</div>
            <div class="logo">GarrSYS</div>
            <div class="subtitle">¡Cuenta Verificada Exitosamente!</div>
          </div>

          <div class="content">
            <div class="greeting">¡Hola ${data.userName}!</div>

            <div class="success-message">
              <p>¡Felicitaciones! Tu cuenta ha sido verificada exitosamente y ya puedes acceder a todas las funcionalidades de GarrSYS.</p>
            </div>

            <p class="features-title">¿Qué puedes hacer ahora?</p>
            <ul class="features-list">
              <li>Explorar nuestro catálogo de productos</li>
              <li>Realizar consultas y búsquedas avanzadas</li>
              <li>Acceder a información detallada de autoridades y zonas</li>
              <li>Participar en el sistema de decisiones estratégicas</li>
            </ul>

            <div class="button-container">
              <a href="${data.loginUrl}" class="button">Iniciar Sesión</a>
            </div>

            <div class="divider"></div>

            <p class="text">Si tienes alguna pregunta o necesitas ayuda, nuestro equipo de soporte está aquí para asistirte.</p>

            <p class="text" style="font-weight: 600; color: #efe9dd;">¡Disfruta de tu experiencia en GarrSYS!</p>
          </div>

          <div class="footer">
            <div class="academic-info">
              <div class="academic-title">GarrSYS</div>
              <div class="academic-text">
                Proyecto académico desarrollado en UTN – Facultad Regional Rosario<br>
                Zeballos 1341, Rosario, Santa Fe, Argentina
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ¡Hola ${data.userName}!

      ¡Felicitaciones! Tu cuenta ha sido verificada exitosamente.

      Ya puedes acceder a todas las funcionalidades de GarrSYS:

      - Explorar nuestro catálogo de productos
      - Realizar consultas y búsquedas avanzadas
      - Acceder a información detallada
      - Participar en decisiones estratégicas

      Ve al inicio: ${data.loginUrl}

      ¡Disfruta de tu experiencia en GarrSYS!

      ---
      GarrSYS
      Proyecto académico desarrollado en UTN – Facultad Regional Rosario
      Zeballos 1341, Rosario, Santa Fe, Argentina
    `;

    return { subject, html, text };
  }

  /**
   * Admin notification template
   */
  private getAdminNotificationTemplate(data: any) {
    const subject = `Nueva solicitud de verificación - ${data.clientName}`;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Solicitud de Verificación</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #e5e7eb;
            background: linear-gradient(135deg, #0b0e11 0%, #11161b 100%);
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, rgba(17, 22, 27, 0.95) 0%, rgba(15, 20, 25, 0.95) 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(195, 164, 98, 0.2);
            border: 1px solid rgba(195, 164, 98, 0.15);
          }
          .header {
            background: linear-gradient(135deg, #3a2c0f 0%, #1f1808 100%);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 2px solid rgba(245, 158, 11, 0.3);
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%);
            animation: glow 8s ease-in-out infinite;
          }
          @keyframes glow {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
            50% { transform: translate(10px, 10px) scale(1.1); opacity: 0.8; }
          }
          .logo {
            font-family: 'Cormorant Garamond', serif;
            font-size: 42px;
            font-weight: 700;
            color: #c3a462;
            margin-bottom: 8px;
            position: relative;
            letter-spacing: 2px;
            text-shadow: 0 2px 20px rgba(195, 164, 98, 0.3);
          }
          .subtitle {
            font-size: 18px;
            color: #fcd34d;
            font-weight: 600;
            position: relative;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .notification-icon {
            font-size: 24px;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .content {
            padding: 40px 30px;
          }
          .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #efe9dd;
            margin-bottom: 20px;
          }
          .text {
            color: #cbd5e1;
            margin-bottom: 20px;
            font-size: 15px;
            line-height: 1.7;
          }
          .info-box {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.05) 100%);
            border: 1px solid rgba(245, 158, 11, 0.25);
            border-left: 4px solid #f59e0b;
            padding: 20px;
            border-radius: 10px;
            margin: 25px 0;
          }
          .info-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid rgba(245, 158, 11, 0.1);
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #fcd34d;
            min-width: 100px;
            font-size: 14px;
          }
          .info-value {
            color: #e5e7eb;
            font-size: 14px;
            word-break: break-word;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #ffffff;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3), 0 0 0 1px rgba(245, 158, 11, 0.4);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
          }
          .button:hover {
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            box-shadow: 0 15px 40px rgba(245, 158, 11, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.6);
            transform: translateY(-2px);
          }
          .important-title {
            font-weight: 600;
            color: #efe9dd;
            margin-top: 30px;
            margin-bottom: 12px;
            font-size: 16px;
          }
          .important-list {
            list-style: none;
            padding: 0;
          }
          .important-list li {
            padding: 10px 0 10px 28px;
            position: relative;
            color: #cbd5e1;
            font-size: 14px;
          }
          .important-list li::before {
            content: '•';
            position: absolute;
            left: 8px;
            color: #f59e0b;
            font-weight: 700;
            font-size: 20px;
          }
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(195, 164, 98, 0.3) 50%, transparent 100%);
            margin: 30px 0;
          }
          .footer {
            background: rgba(11, 14, 17, 0.6);
            padding: 30px;
            text-align: center;
            border-top: 1px solid rgba(195, 164, 98, 0.15);
          }
          .footer-text {
            color: #9aa0a6;
            font-size: 13px;
            margin-bottom: 20px;
          }
          .academic-info {
            padding-top: 20px;
            border-top: 1px solid rgba(195, 164, 98, 0.15);
          }
          .academic-title {
            font-family: 'Cormorant Garamond', serif;
            font-weight: 700;
            color: #c3a462;
            font-size: 16px;
            margin-bottom: 8px;
          }
          .academic-text {
            font-size: 12px;
            color: #9aa0a6;
            line-height: 1.6;
          }
          .admin-badge {
            display: inline-block;
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
            border: 1px solid rgba(245, 158, 11, 0.3);
            letter-spacing: 0.5px;
          }
          @media only screen and (max-width: 600px) {
            .container { border-radius: 0; margin: -20px; }
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
            .logo { font-size: 36px; }
            .section-title { font-size: 18px; }
            .info-row { flex-direction: column; }
            .info-label { margin-bottom: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">GarrSYS</div>
            <div class="subtitle">
              <span class="notification-icon">📧</span>
              Nueva Solicitud de Verificación
            </div>
          </div>

          <div class="content">
            <div class="admin-badge">PANEL DE ADMINISTRADOR</div>

            <div class="section-title">Notificación de Administrador</div>

            <p class="text">Un cliente ha solicitado verificación de su dirección de email:</p>

            <div class="info-box">
              <div class="info-row">
                <div class="info-label">Cliente:</div>
                <div class="info-value">${data.clientName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value">${data.clientEmail}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Fecha:</div>
                <div class="info-value">${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</div>
              </div>
            </div>

            <p class="text">Como administrador, puedes revisar y gestionar esta solicitud en el panel administrativo.</p>

            <div class="button-container">
              <a href="${data.adminPanelUrl}" class="button">Revisar Solicitudes</a>
            </div>

            <div class="divider"></div>

            <p class="important-title">Información importante:</p>
            <ul class="important-list">
              <li>El cliente ya tiene información personal registrada</li>
              <li>La solicitud incluye un token de verificación único</li>
              <li>El token expira en 24 horas</li>
              <li>Se permiten máximo 3 intentos de verificación</li>
            </ul>

            <div class="divider"></div>

            <p class="text" style="font-size: 13px; color: #9aa0a6;">Esta notificación se envió automáticamente cuando el cliente solicitó verificación de email.</p>
          </div>

          <div class="footer">
            <div class="academic-info">
              <div class="academic-title">GarrSYS</div>
              <div class="academic-text">
                Proyecto académico desarrollado en UTN – Facultad Regional Rosario<br>
                Zeballos 1341, Rosario, Santa Fe, Argentina
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Nueva Solicitud de Verificación

      Cliente: ${data.clientName}
      Email: ${data.clientEmail}
      Fecha: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}

      El cliente ya tiene información personal registrada y ha solicitado verificación de email.

      Revisa las solicitudes pendientes en: ${data.adminPanelUrl}

      Información importante:
      - Token único de verificación
      - Expira en 24 horas
      - Máximo 3 intentos permitidos

      Esta notificación se envió automáticamente.

      ---
      GarrSYS
      Proyecto académico desarrollado en UTN – Facultad Regional Rosario
      Zeballos 1341, Rosario, Santa Fe, Argentina
    `;

    return { subject, html, text };
  }

  /**
   * Checks if the email service is available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.transporter !== null;
  }

  /**
   * Gets email service statistics
   */
  getStats() {
    return {
      enabled: this.isEnabled,
      configured: this.config !== null,
      provider: this.useSendGrid ? 'SendGrid' : 'SMTP',
      hasCredentials: !!(this.config?.auth.user && this.config?.auth.pass),
      hasSendGridCredentials: !!(this.config?.sendgridApiKey && this.config?.sendgridFrom),
    };
  }
}

// Singleton instance
export const emailService = new EmailService();
