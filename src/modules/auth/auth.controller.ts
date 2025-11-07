// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { User, Role } from './user/user.entity.js';
import { RefreshToken } from './refreshToken.entity.js';
import { orm } from '../../shared/db/orm.js';
import { registerSchema } from './auth.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import logger from '../../shared/utils/logger.js';
import { env } from '../../config/env.js';
import crypto from 'crypto';
import { EmailVerification } from './emailVerification/emailVerification.entity.js';
import { emailService } from '../../shared/services/email.service.js';

// ============================================================================
// AUTHENTICATION CONTROLLER
// ============================================================================

/**
 * Handles authentication operations: register, login, and logout
 *
 * Features:
 * - User registration with validation
 * - Login with JWT token generation
 * - Secure cookie-based session management
 * - Password hashing with Argon2
 */
export class AuthController {
  // ──────────────────────────────────────────────────────────────────────────
  // REGISTRATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Registers a new user in the system
   *
   * Process:
   * 1. Validates request data with Zod schema
   * 2. Checks for existing username/email
   * 3. Hashes password with Argon2
   * 4. Creates user with default CLIENT role
   * 5. Persists to database
   *
   * @param req - Express request with user data in body
   * @param res - Express response
   * @param next - Express next function for error handling
   * @returns 201 with user data or 409 if username/email exists
   *
   * @example
   * POST /api/auth/register
   * Body: { username: 'john', email: 'john@example.com', password: 'secret123' }
   */
  async register(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Validate request data
      // ────────────────────────────────────────────────────────────────────
      const validatedData = registerSchema.parse(req.body);
      const { username, email, password } = validatedData;

      // ────────────────────────────────────────────────────────────────────
      // Check for duplicate username
      // ────────────────────────────────────────────────────────────────────
      const existingUsername = await em.findOne(User, { username });
      if (existingUsername) {
        return ResponseUtil.conflict(
          res,
          'Username is already registered',
          'username'
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Check for duplicate email
      // ────────────────────────────────────────────────────────────────────
      const existingEmail = await em.findOne(User, { email });
      if (existingEmail) {
        return ResponseUtil.conflict(
          res,
          'Email is already registered',
          'email'
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Hash password securely with Argon2
      // ────────────────────────────────────────────────────────────────────
      const hashedPassword = await argon2.hash(password);

      // ────────────────────────────────────────────────────────────────────
      // Create user entity with default CLIENT role
      // ────────────────────────────────────────────────────────────────────
      const newUser = new User(
        username,
        email,
        hashedPassword,
        [Role.USER]
      );

      // ────────────────────────────────────────────────────────────────────
      // Persist to database
      // ────────────────────────────────────────────────────────────────────
      await em.persistAndFlush(newUser);

      // ────────────────────────────────────────────────────────────────────
      // Email verification based on mode (production/development vs demo)
      // ────────────────────────────────────────────────────────────────────
      if (env.EMAIL_VERIFICATION_REQUIRED) {
        // PRODUCTION/DEVELOPMENT MODE: Automatic mandatory verification
        try {
          const emailVerification = new EmailVerification(email);
          await em.persistAndFlush(emailVerification);

          // Send verification email
          const emailSent = await emailService.sendVerificationEmail(
            email,
            emailVerification.token,
            username // Use username as temporary name
          );

          if (emailSent) {
            logger.info({
              userId: newUser.id,
              email
            }, 'Email verification sent automatically after registration');
          } else {
            logger.warn({
              userId: newUser.id,
              email
            }, 'Failed to send verification email after registration');
          }

          return ResponseUtil.created(res, 'User created successfully. Please check your email to verify your account.', {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            roles: newUser.roles,
            emailVerified: newUser.emailVerified,
            verificationRequired: true,
            verificationEmailSent: emailSent,
            expiresAt: emailVerification.expiresAt.toISOString(),
          });

        } catch (verificationError) {
          logger.error({
            err: verificationError,
            userId: newUser.id,
            email
          }, 'Failed to create email verification after registration');

          // If verification fails, still return success but indicate manual request needed
          return ResponseUtil.created(res, 'User created successfully. Please request email verification manually.', {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            roles: newUser.roles,
            emailVerified: newUser.emailVerified,
            verificationRequired: true,
            verificationEmailSent: false,
            message: 'Please request email verification manually from your profile',
          });
        }
      } else {
        // DEMO MODE: Optional verification (user can verify when desired)
        logger.info({
          userId: newUser.id,
          email,
          mode: 'demo'
        }, 'User created in demo mode - email verification is optional');

        return ResponseUtil.created(res, 'User created successfully (demo mode - email verification optional)', {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          roles: newUser.roles,
          emailVerified: newUser.emailVerified,
          verificationRequired: false,
          mode: 'demo',
          message: 'You can verify your email later if needed',
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Authenticates user and creates session
   *
   * Process:
   * 1. Validates credentials (email + password)
   * 2. Verifies password with Argon2
   * 3. Generates JWT access token (1h expiry)
   * 4. Sets secure HTTP-only cookie
   * 5. Returns user data (DTO)
   *
   * @param req - Express request with email and password in body
   * @param res - Express response
   * @param next - Express next function for error handling
   * @returns 200 with user DTO and sets access_token cookie
   *
   * @example
   * POST /api/auth/login
   * Body: { email: 'john@example.com', password: 'secret123' }
   */
  async login(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract credentials from request
      // ────────────────────────────────────────────────────────────────────
      const { email, password } = req.body;

      // ────────────────────────────────────────────────────────────────────
      // Find user and verify credentials
      // ────────────────────────────────────────────────────────────────────
      const user = await em.findOne(User, { email });

      if (!user || !(await argon2.verify(user.password, password))) {
        return ResponseUtil.unauthorized(res, 'Invalid credentials');
      }

      // ────────────────────────────────────────────────────────────────────
      // Verify that email is verified (if enabled)
      // ────────────────────────────────────────────────────────────────────
      if (env.EMAIL_VERIFICATION_REQUIRED && !user.emailVerified) {
        logger.warn({
          userId: user.id,
          email: user.email
        }, 'User attempted login without email verification');

        return ResponseUtil.error(
          res,
          'Email verification required. Please check your email and verify your account before logging in.',
          403,
          [
            {
              field: 'emailVerified',
              message: 'Email verification is required to access your account',
              code: 'EMAIL_VERIFICATION_REQUIRED'
            }
          ]
        );
      }

      // ────────────────────────────────────────────────────────────────────
      // Update last login timestamp
      // ────────────────────────────────────────────────────────────────────
      user.lastLoginAt = new Date();
      await em.flush();

      // ────────────────────────────────────────────────────────────────────
      // Generate JWT access token (short-lived)
      // ────────────────────────────────────────────────────────────────────
      const accessToken = jwt.sign(
        { id: user.id, roles: user.roles },
        env.JWT_SECRET,
        { expiresIn: '15m' } // 15 minutes
      );

      // ────────────────────────────────────────────────────────────────────
      // Generate refresh token (long-lived)
      // ────────────────────────────────────────────────────────────────────
      const refreshTokenString = crypto.randomBytes(64).toString('hex');
      const hashedRefreshToken = await argon2.hash(refreshTokenString);

      // Store refresh token in database
      const refreshToken = em.create(RefreshToken, {
        token: hashedRefreshToken,
        user: user as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
        isRevoked: false,
      });

      await em.persistAndFlush(refreshToken);

      // ────────────────────────────────────────────────────────────────────
      // Set secure HTTP-only cookies and return user data
      // ────────────────────────────────────────────────────────────────────
      res
        .cookie('access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1000 * 60 * 15, // 15 minutes
        })
        .cookie('refresh_token', refreshTokenString, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        })
        .json({
          success: true,
          message: 'Login successful',
          data: user.toDTO(),
          meta: {
            timestamp: new Date().toISOString(),
            statusCode: 200,
          },
        });
    } catch (err) {
      next(err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Logs out user by clearing authentication cookies and revoking refresh token
   *
   * Process:
   * 1. Revokes refresh token in database
   * 2. Clears access_token and refresh_token cookies
   * 3. Returns success confirmation
   *
   * @param req - Express request
   * @param res - Express response
   * @returns 200 with logout confirmation
   *
   * @example
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const refreshTokenString = req.cookies.refresh_token;

      if (refreshTokenString) {
        // Find and revoke all matching refresh tokens
        const tokens = await em.find(RefreshToken, {});
        for (const token of tokens) {
          if (await argon2.verify(token.token, refreshTokenString)) {
            token.revoke();
          }
        }
        await em.flush();
      }

      res
        .clearCookie('access_token')
        .clearCookie('refresh_token')
        .json({
          success: true,
          message: 'Logout successful',
          meta: {
            timestamp: new Date().toISOString(),
            statusCode: 200,
          },
        });
    } catch (err) {
      res.clearCookie('access_token').clearCookie('refresh_token').json({
        success: true,
        message: 'Logout successful',
        meta: {
          timestamp: new Date().toISOString(),
          statusCode: 200,
        },
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Refreshes access token using refresh token
   *
   * Process:
   * 1. Validates refresh token from cookie
   * 2. Checks if token exists and is active in database
   * 3. Generates new access token
   * 4. Optionally rotates refresh token for security
   * 5. Returns new tokens
   *
   * @param req - Express request with refresh_token cookie
   * @param res - Express response
   * @returns 200 with new access token
   *
   * @example
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const refreshTokenString = req.cookies.refresh_token;

      if (!refreshTokenString) {
        return ResponseUtil.unauthorized(res, 'Refresh token not found');
      }

      // Find matching refresh token in database
      const tokens = await em.find(RefreshToken, {}, { populate: ['user'] });
      let validToken: RefreshToken | null = null;

      for (const token of tokens) {
        if (await argon2.verify(token.token, refreshTokenString)) {
          validToken = token;
          break;
        }
      }

      if (!validToken || !validToken.isActive()) {
        return ResponseUtil.unauthorized(res, 'Invalid or expired refresh token');
      }

      // Access the user - with populate it's already loaded
      const user = validToken.user as any;

      // Generate new access token
      const accessToken = jwt.sign(
        { id: user.id, roles: user.roles },
        env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Optional: Rotate refresh token for added security
      const newRefreshTokenString = crypto.randomBytes(64).toString('hex');
      const hashedNewRefreshToken = await argon2.hash(newRefreshTokenString);

      // Revoke old token
      validToken.revoke();

      // Create new refresh token
      const newRefreshToken = em.create(RefreshToken, {
        token: hashedNewRefreshToken,
        user: user as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
        isRevoked: false,
      });

      await em.persistAndFlush(newRefreshToken);

      // Set new cookies
      res
        .cookie('access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1000 * 60 * 15, // 15 minutes
        })
        .cookie('refresh_token', newRefreshTokenString, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        })
        .json({
          success: true,
          message: 'Token refreshed successfully',
          data: user.toDTO(),
          meta: {
            timestamp: new Date().toISOString(),
            statusCode: 200,
          },
        });
    } catch (err) {
      logger.error({ err }, 'Error refreshing token');
      return ResponseUtil.internalError(res, 'Failed to refresh token', err);
    }
  }
}