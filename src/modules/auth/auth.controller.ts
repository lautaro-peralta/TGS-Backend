// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { User, Role } from '../auth/user.entity.js';
import { orm } from '../../shared/db/orm.js';
import { registerSchema } from './auth.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * JWT secret key for token signing and verification
 * Should be set via environment variable in production
 */
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';

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
      const newUser = em.create(User, {
        username,
        roles: [Role.CLIENT], // Default role for new registrations
        password: hashedPassword,
        email,
      });

      // ────────────────────────────────────────────────────────────────────
      // Persist to database
      // ────────────────────────────────────────────────────────────────────
      await em.persistAndFlush(newUser);

      // ────────────────────────────────────────────────────────────────────
      // Return sanitized user data (exclude password)
      // ────────────────────────────────────────────────────────────────────
      return ResponseUtil.created(res, 'User created successfully', {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        roles: newUser.roles,
      });
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
      // Generate JWT access token
      // ────────────────────────────────────────────────────────────────────
      const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET, {
        expiresIn: '1h',
      });

      // ────────────────────────────────────────────────────────────────────
      // Set secure HTTP-only cookie and return user data
      // ────────────────────────────────────────────────────────────────────
      res
        .cookie('access_token', token, {
          httpOnly: true, // Prevents JavaScript access (XSS protection)
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          sameSite: 'strict', // CSRF protection
          maxAge: 1000 * 60 * 60, // 1 hour
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

      // ────────────────────────────────────────────────────────────────────
      // REFRESH TOKEN IMPLEMENTATION (commented out)
      // Uncomment below to enable refresh token functionality
      // ────────────────────────────────────────────────────────────────────
      /*
      const refreshToken = jwt.sign(
        { id: user.id, roles: user.roles },
        JWT_SECRET,
        { expiresIn: '15d' }
      );
      
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 15, // 15 days
      });
      */
    } catch (err) {
      next(err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Logs out user by clearing authentication cookie
   *
   * Process:
   * 1. Clears access_token cookie
   * 2. Returns success confirmation
   *
   * Note: Client should also clear any stored user data
   *
   * @param req - Express request
   * @param res - Express response
   * @returns 200 with logout confirmation
   *
   * @example
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response) {
    res.clearCookie('access_token').json({
      success: true,
      message: 'Logout successful',
      meta: {
        timestamp: new Date().toISOString(),
        statusCode: 200,
      },
    });
  }
}
