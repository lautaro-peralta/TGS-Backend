// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { MonthlyReviewController } from './monthlyReview.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createMonthlyReviewSchema,
  updateMonthlyReviewSchema,
} from './monthlyReview.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - MonthlyReview
// ============================================================================
export const monthlyReviewRouter = Router();
const monthlyReviewController = new MonthlyReviewController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES - Monthly Reviews
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/monthly-reviews/search
 * @desc    Search monthly reviews with filters
 * @access  Private (PARTNER, ADMIN)
 * @query   year, month, status, partnerDni, page, limit
 */
monthlyReviewRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  monthlyReviewController.searchMonthlyReviews
);

/**
 * @route   GET /api/monthly-reviews/statistics
 * @desc    Get sales statistics for dashboard/graphs
 * @access  Private (PARTNER, ADMIN)
 * @query   year (required), month (optional), groupBy (optional)
 */
monthlyReviewRouter.get(
  '/statistics',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  monthlyReviewController.getSalesStatistics
);

/**
 * @route   GET /api/monthly-reviews
 * @desc    Get all monthly reviews
 * @access  Private (PARTNER, ADMIN)
 */
monthlyReviewRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  monthlyReviewController.getAllMonthlyReviews
);

/**
 * @route   GET /api/monthly-reviews/:id
 * @desc    Get a single monthly review by ID
 * @access  Private (PARTNER, ADMIN)
 */
monthlyReviewRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  monthlyReviewController.getOneMonthlyReviewById
);

/**
 * @route   POST /api/monthly-reviews
 * @desc    Create a new monthly review
 * @access  Private (PARTNER, ADMIN)
 */
monthlyReviewRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  validateWithSchema({ body: createMonthlyReviewSchema }),
  monthlyReviewController.createMonthlyReview
);

/**
 * @route   PATCH /api/monthly-reviews/:id
 * @desc    Update a monthly review
 * @access  Private (PARTNER, ADMIN)
 */
monthlyReviewRouter.patch(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.PARTNER, Role.ADMIN]),
  validateWithSchema({ body: updateMonthlyReviewSchema }),
  monthlyReviewController.updateMonthlyReview
);

/**
 * @route   DELETE /api/monthly-reviews/:id
 * @desc    Delete a monthly review
 * @access  Private (ADMIN only)
 */
monthlyReviewRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  monthlyReviewController.deleteMonthlyReview
);
