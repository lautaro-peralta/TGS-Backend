// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { Role } from './user.entity.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extended JWT payload with user identification and roles
 */
interface TokenPayload extends JwtPayload {
  id: number;
  roles: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * JWT secret key for token verification
 * Should be set via environment variable in production
 */
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Middleware to verify JWT token from cookies and authenticate requests
 *
 * Process:
 * 1. Extracts access_token from HTTP-only cookies
 * 2. Verifies token signature and expiration
 * 3. Attaches user data (id, roles) to request object
 * 4. Passes control to next middleware
 *
 * Logs all authentication attempts for debugging and security auditing
 *
 * @param req - Express request (extended with user and cookies)
 * @param res - Express response
 * @param next - Express next function
 * @returns 401 if token missing/invalid, otherwise continues to next middleware
 *
 * @example
 * router.get('/profile', authMiddleware, getUserProfile);
 */
export function authMiddleware(
  req: Request & {
    user?: { id: number; roles: string[] };
    cookies?: Record<string, string>;
  },
  res: Response,
  next: NextFunction
) {
  // ──────────────────────────────────────────────────────────────────────────
  // Extract token from cookies
  // ──────────────────────────────────────────────────────────────────────────
  const token = req.cookies?.access_token;

  console.log('🛡️ [authMiddleware] Token from cookies:', token);

  // ──────────────────────────────────────────────────────────────────────────
  // Validate token presence
  // ──────────────────────────────────────────────────────────────────────────
  if (!token) {
    console.warn("⚠️ [authMiddleware] Cookie 'access_token' not found");
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Verify token and extract payload
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    console.log('✅ [authMiddleware] Valid token, payload:', payload);

    // ────────────────────────────────────────────────────────────────────────
    // Attach user data to request for downstream middleware/controllers
    // ────────────────────────────────────────────────────────────────────────
    req.user = {
      id: payload.id,
      roles: payload.roles,
    };

    return next();
  } catch (error) {
    // ────────────────────────────────────────────────────────────────────────
    // Handle invalid or expired tokens
    // ────────────────────────────────────────────────────────────────────────
    console.error('❌ [authMiddleware] Invalid or expired token:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Middleware factory to check user roles against allowed roles
 *
 * Process:
 * 1. Verifies user is authenticated (from authMiddleware)
 * 2. Checks if user has at least one of the allowed roles
 * 3. Grants or denies access based on role match
 *
 * Must be used AFTER authMiddleware in the middleware chain
 *
 * @param allowedRoles - Array of roles permitted to access the resource
 * @returns Express middleware function
 *
 * @example
 * // Allow only ADMIN and MODERATOR roles
 * router.delete('/users/:id',
 *   authMiddleware,
 *   rolesMiddleware([Role.ADMIN, Role.MODERATOR]),
 *   deleteUser
 * );
 *
 * @example
 * // Allow only ADMIN role
 * router.post('/settings',
 *   authMiddleware,
 *   rolesMiddleware([Role.ADMIN]),
 *   updateSettings
 * );
 */
export function rolesMiddleware(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // ──────────────────────────────────────────────────────────────────────
    // Extract user from request (set by authMiddleware)
    // ──────────────────────────────────────────────────────────────────────
    const user = (req as any).user;

    // ──────────────────────────────────────────────────────────────────────
    // Validate user authentication
    // ──────────────────────────────────────────────────────────────────────
    if (!user || !user.roles) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // ──────────────────────────────────────────────────────────────────────
    // Check if user has at least one allowed role
    // ──────────────────────────────────────────────────────────────────────
    const hasRole = user.roles.some((role: Role) =>
      allowedRoles.includes(role)
    );

    // ──────────────────────────────────────────────────────────────────────
    // Grant or deny access based on role match
    // ──────────────────────────────────────────────────────────────────────
    if (!hasRole) {
      return res.status(403).json({
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
}
