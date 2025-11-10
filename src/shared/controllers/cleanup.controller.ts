// ============================================================================
// CLEANUP CONTROLLER - Admin endpoints for cleanup operations
// ============================================================================

import { Request, Response } from 'express';
import { schedulerService } from '../services/scheduler.service.js';
import { cleanupService } from '../services/cleanup.service.js';
import { ResponseUtil } from '../utils/response.util.js';
import logger from '../utils/logger.js';

/**
 * Controller for cleanup and scheduler operations
 * Provides admin endpoints to manage automated cleanup tasks
 */
export class CleanupController {

  /**
   * Get scheduler status and information
   */
  async getSchedulerStatus(req: Request, res: Response) {
    try {
      const status = schedulerService.getStatus();

      return ResponseUtil.success(res, 'Scheduler status retrieved successfully', status);
    } catch (error) {
      logger.error({ err: error }, 'Error getting scheduler status');
      return ResponseUtil.internalError(res, 'Failed to get scheduler status', error);
    }
  }

  /**
   * Get cleanup preview (what would be cleaned without actually doing it)
   */
  async getCleanupPreview(req: Request, res: Response) {
    try {
      const daysOld = req.query.daysOld ? Number(req.query.daysOld) : 7;

      if (isNaN(daysOld) || daysOld < 1) {
        return ResponseUtil.validationError(res, 'Invalid daysOld parameter', [
          { field: 'daysOld', message: 'Must be a number greater than 0' }
        ]);
      }

      const preview = await schedulerService.getCleanupPreview(daysOld);

      return ResponseUtil.success(res, 'Cleanup preview generated successfully', {
        daysOld,
        preview,
        message: `Found ${preview.unverifiedAccountsCount} unverified accounts older than ${daysOld} days and ${preview.expiredVerificationsCount} expired verifications`
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting cleanup preview');
      return ResponseUtil.internalError(res, 'Failed to get cleanup preview', error);
    }
  }

  /**
   * Manually trigger cleanup now (admin only)
   */
  async triggerCleanup(req: Request, res: Response) {
    try {
      logger.info({
        admin: (req as any).user?.id,
        adminEmail: (req as any).user?.email
      }, 'Manual cleanup triggered by admin');

      const results = await schedulerService.triggerCleanupNow();

      return ResponseUtil.success(res, 'Cleanup executed successfully', {
        results,
        deletedItems: results.totalCleaned,
        breakdown: {
          unverifiedAccounts: results.unverifiedAccounts,
          expiredVerifications: results.emailVerifications
        }
      });
    } catch (error) {
      logger.error({ err: error, admin: (req as any).user?.id }, 'Error triggering manual cleanup');
      return ResponseUtil.internalError(res, 'Failed to execute cleanup', error);
    }
  }

  /**
   * Clean expired unverified accounts only
   */
  async cleanExpiredAccounts(req: Request, res: Response) {
    try {
      const daysOld = req.query.daysOld ? Number(req.query.daysOld) : 7;

      if (isNaN(daysOld) || daysOld < 1) {
        return ResponseUtil.validationError(res, 'Invalid daysOld parameter', [
          { field: 'daysOld', message: 'Must be a number greater than 0' }
        ]);
      }

      logger.info({
        admin: (req as any).user?.id,
        daysOld
      }, 'Manual account cleanup triggered by admin');

      const deletedCount = await cleanupService.cleanExpiredUnverifiedAccounts(daysOld);

      return ResponseUtil.success(res, 'Expired accounts cleaned successfully', {
        deletedCount,
        daysOld,
        message: `Deleted ${deletedCount} unverified accounts older than ${daysOld} days`
      });
    } catch (error) {
      logger.error({ err: error }, 'Error cleaning expired accounts');
      return ResponseUtil.internalError(res, 'Failed to clean expired accounts', error);
    }
  }

  /**
   * Clean expired email verifications only
   */
  async cleanExpiredVerifications(req: Request, res: Response) {
    try {
      logger.info({
        admin: (req as any).user?.id
      }, 'Manual verification cleanup triggered by admin');

      const deletedCount = await cleanupService.cleanExpiredEmailVerifications();

      return ResponseUtil.success(res, 'Expired verifications cleaned successfully', {
        deletedCount,
        message: `Deleted ${deletedCount} expired email verifications`
      });
    } catch (error) {
      logger.error({ err: error }, 'Error cleaning expired verifications');
      return ResponseUtil.internalError(res, 'Failed to clean expired verifications', error);
    }
  }
}
