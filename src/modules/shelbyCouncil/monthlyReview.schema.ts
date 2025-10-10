// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { ReviewStatus } from './monthlyReview.entity.js';

// ============================================================================
// SCHEMAS - MonthlyReview
// ============================================================================

/**
 * Schema for creating a new monthly review
 */
export const createMonthlyReviewSchema = z.object({
  /**
   * Year of the review (e.g., 2025)
   */
  year: z.number().int().min(2000).max(2100),

  /**
   * Month of the review (1-12)
   */
  month: z.number().int().min(1).max(12),

  /**
   * Date when the review was conducted (ISO 8601 format)
   */
  reviewDate: z.string().datetime().optional(),

  /**
   * DNI of the partner conducting the review
   */
  partnerDni: z.string().min(1),

  /**
   * Status of the review
   */
  status: z.enum([
    ReviewStatus.PENDING,
    ReviewStatus.IN_REVIEW,
    ReviewStatus.COMPLETED,
    ReviewStatus.APPROVED,
    ReviewStatus.REJECTED,
  ]).optional(),

  /**
   * Observations about the monthly sales
   */
  observations: z.string().optional(),

  /**
   * Recommendations or action items
   */
  recommendations: z.string().optional(),
});

/**
 * Schema for updating a monthly review
 */
export const updateMonthlyReviewSchema = z.object({
  /**
   * Status of the review
   */
  status: z.enum([
    ReviewStatus.PENDING,
    ReviewStatus.IN_REVIEW,
    ReviewStatus.COMPLETED,
    ReviewStatus.APPROVED,
    ReviewStatus.REJECTED,
  ]).optional(),

  /**
   * Observations about the monthly sales
   */
  observations: z.string().optional(),

  /**
   * Recommendations or action items
   */
  recommendations: z.string().optional(),

  /**
   * Date when the review was conducted (ISO 8601 format)
   */
  reviewDate: z.string().datetime().optional(),
});

/**
 * Schema for searching monthly reviews
 */
export const searchMonthlyReviewsSchema = z.object({
  /**
   * Filter by year
   */
  year: z.coerce.number().int().min(2000).max(2100).optional(),

  /**
   * Filter by month
   */
  month: z.coerce.number().int().min(1).max(12).optional(),

  /**
   * Filter by status
   */
  status: z.enum([
    ReviewStatus.PENDING,
    ReviewStatus.IN_REVIEW,
    ReviewStatus.COMPLETED,
    ReviewStatus.APPROVED,
    ReviewStatus.REJECTED,
  ]).optional(),

  /**
   * Filter by partner DNI
   */
  partnerDni: z.string().optional(),

  /**
   * Page number for pagination
   */
  page: z.coerce.number().int().positive().optional(),

  /**
   * Items per page
   */
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Schema for sales statistics query parameters
 */
export const salesStatsSchema = z.object({
  /**
   * Year for statistics
   */
  year: z.coerce.number().int().min(2000).max(2100),

  /**
   * Month for statistics (optional, if not provided returns yearly stats)
   */
  month: z.coerce.number().int().min(1).max(12).optional(),

  /**
   * Group results by (distributor, product, client, etc.)
   */
  groupBy: z.enum(['distributor', 'product', 'client', 'day', 'zone']).optional(),
});
