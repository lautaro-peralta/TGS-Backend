// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { User } from '../../modules/auth/user/user.entity.js';
import { orm } from '../../shared/db/orm.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import logger from '../../shared/utils/logger.js';

// ============================================================================
// PROFILE COMPLETENESS MIDDLEWARE
// ============================================================================

/**
 * Middleware to check if user profile has minimum completeness for certain actions
 *
 * Process:
 * 1. Extracts authenticated user ID from request
 * 2. Fetches user from database
 * 3. Validates profile completeness meets minimum requirement
 * 4. Provides helpful suggestions if profile is incomplete
 *
 * Must be used AFTER authMiddleware in the middleware chain
 *
 * @param minCompleteness - Minimum profile completeness percentage required (0-100)
 * @returns Express middleware function
 *
 * @example
 * // Require 75% profile completeness for sales
 * router.post('/sales',
 *   authMiddleware,
 *   requireProfileCompleteness(75),
 *   createSale
 * );
 *
 * @example
 * // Require 50% profile completeness for bribes
 * router.post('/bribes',
 *   authMiddleware,
 *   requireProfileCompleteness(50),
 *   createBribe
 * );
 */
export function requireProfileCompleteness(minCompleteness: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract authenticated user ID
      // ────────────────────────────────────────────────────────────────────
      const user = (req as any).user;

      if (!user || !user.id) {
        return ResponseUtil.unauthorized(res, 'Not authenticated');
      }

      // ────────────────────────────────────────────────────────────────────
      // Fetch full user from database with person relation
      // ────────────────────────────────────────────────────────────────────
      const fullUser = await em.findOne(
        User,
        { id: user.id },
        { populate: ['person'] }
      );

      if (!fullUser) {
        return ResponseUtil.notFound(res, 'User', user.id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Check profile completeness
      // ────────────────────────────────────────────────────────────────────
      if (fullUser.profileCompleteness < minCompleteness) {
        const suggestions = fullUser.getProfileSuggestions();

        return res.status(403).json({
          success: false,
          message: `Profile completeness required: ${minCompleteness}%. Current: ${fullUser.profileCompleteness}%`,
          data: {
            currentCompleteness: fullUser.profileCompleteness,
            requiredCompleteness: minCompleteness,
            suggestions,
          },
          meta: {
            timestamp: new Date().toISOString(),
            statusCode: 403,
          },
        });
      }

      // ────────────────────────────────────────────────────────────────────
      // Profile meets requirements, continue
      // ────────────────────────────────────────────────────────────────────
      next();
    } catch (error) {
      logger.error({ err: error }, 'Error checking profile completeness');
      return ResponseUtil.internalError(
        res,
        'Error checking profile completeness',
        error
      );
    }
  };
}

/**
 * Middleware to check if user can perform a specific action based on profile completeness
 *
 * Process:
 * 1. Extracts authenticated user ID from request
 * 2. Fetches user from database
 * 3. Uses user.canPerformAction() method to validate
 * 4. Provides helpful suggestions if action is not allowed
 *
 * Must be used AFTER authMiddleware in the middleware chain
 *
 * @param action - Action type to check ('purchase' | 'admin')
 * @returns Express middleware function
 *
 * @example
 * // Check if user can make purchases
 * router.post('/sales',
 *   authMiddleware,
 *   requireActionPermission('purchase'),
 *   createSale
 * );
 */
export function requireActionPermission(
  action: 'purchase' | 'admin'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────────────────────────────────────────
      // Extract authenticated user ID
      // ────────────────────────────────────────────────────────────────────
      const user = (req as any).user;

      if (!user || !user.id) {
        return ResponseUtil.unauthorized(res, 'Not authenticated');
      }

      // ────────────────────────────────────────────────────────────────────
      // Fetch full user from database with person relation
      // ────────────────────────────────────────────────────────────────────
      const fullUser = await em.findOne(
        User,
        { id: user.id },
        { populate: ['person'] }
      );

      if (!fullUser) {
        return ResponseUtil.notFound(res, 'User', user.id);
      }

      // ────────────────────────────────────────────────────────────────────
      // Check if user can perform the action
      // ────────────────────────────────────────────────────────────────────
      if (!fullUser.canPerformAction(action)) {
        const suggestions = fullUser.getProfileSuggestions();
        const requiredCompleteness = 100;

        return res.status(403).json({
          success: false,
          message: `Cannot perform '${action}' action. Profile completeness required: ${requiredCompleteness}%. Current: ${fullUser.profileCompleteness}%`,
          data: {
            action,
            currentCompleteness: fullUser.profileCompleteness,
            requiredCompleteness,
            isVerified: fullUser.isVerified,
            hasPersonalInfo: fullUser.hasPersonalInfo,
            suggestions,
          },
          meta: {
            timestamp: new Date().toISOString(),
            statusCode: 403,
          },
        });
      }

      // ────────────────────────────────────────────────────────────────────
      // User can perform action, continue
      // ────────────────────────────────────────────────────────────────────
      next();
    } catch (error) {
      logger.error({ err: error }, 'Error checking action permission');
      return ResponseUtil.internalError(
        res,
        'Error checking action permission',
        error
      );
    }
  };
}

/**
 * Middleware specifically for checking if a user can make purchases
 *
 * Process:
 * 1. Extracts authenticated user ID from request
 * 2. Fetches user from database
 * 3. Verifies email is verified AND personal info is complete
 * 4. Provides specific purchase requirement suggestions if not met
 *
 * Must be used AFTER authMiddleware in the middleware chain
 *
 * @returns Express middleware function
 *
 * @example
 * // Protect purchase/sale endpoints for authenticated users
 * router.post('/sales',
 *   authMiddleware,
 *   requireClientCanPurchase,
 *   createSale
 * );
 */
export async function requireClientCanPurchase(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const em = orm.em.fork();

  try {
    // ────────────────────────────────────────────────────────────────────
    // Extract authenticated user ID
    // ────────────────────────────────────────────────────────────────────
    const user = (req as any).user;

    if (!user || !user.id) {
      return ResponseUtil.unauthorized(res, 'Not authenticated');
    }

    // ────────────────────────────────────────────────────────────────────
    // Fetch full user from database with person relation
    // ────────────────────────────────────────────────────────────────────
    const fullUser = await em.findOne(
      User,
      { id: user.id },
      { populate: ['person'] }
    );

    if (!fullUser) {
      return ResponseUtil.notFound(res, 'User', user.id);
    }

    // ────────────────────────────────────────────────────────────────────
    // Check if user can purchase
    // ────────────────────────────────────────────────────────────────────
    if (!fullUser.canPurchase()) {
      const suggestions = fullUser.getPurchaseRequirementSuggestions();

      return res.status(403).json({
        success: false,
        message: 'Cannot make purchases. Email verification and complete personal information are required.',
        data: {
          isVerified: fullUser.isVerified,
          hasPersonalInfo: fullUser.hasPersonalInfo,
          profileCompleteness: fullUser.profileCompleteness,
          requirements: {
            isVerified: {
              current: fullUser.isVerified,
              required: true,
            },
            personalInfo: {
              current: fullUser.hasPersonalInfo,
              required: true,
            },
          },
          suggestions,
        },
        meta: {
          timestamp: new Date().toISOString(),
          statusCode: 403,
        },
      });
    }

    // ────────────────────────────────────────────────────────────────────
    // User can purchase, continue
    // ────────────────────────────────────────────────────────────────────
    next();
  } catch (error) {
    logger.error({ err: error }, 'Error checking purchase permission');
    return ResponseUtil.internalError(
      res,
      'Error checking purchase permission',
      error
    );
  }
}