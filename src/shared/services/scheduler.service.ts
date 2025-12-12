// ============================================================================
// SCHEDULER SERVICE - Automated task scheduling service
// ============================================================================

import * as cron from 'node-cron';
import { cleanupService } from './cleanup.service.js';
import logger from '../utils/logger.js';

/**
 * Service for scheduling automated tasks
 *
 * Currently scheduled tasks:
 * - Daily cleanup of expired unverified accounts (runs at 3 AM)
 * - Daily cleanup of expired email verifications (runs at 3 AM)
 */
export class SchedulerService {
  private tasks: cron.ScheduledTask[] = [];
  private isStarted: boolean = false;

  /**
   * Start all scheduled tasks
   */
  start(): void {
    if (this.isStarted) {
      logger.warn('Scheduler service is already running');
      return;
    }

    logger.info('Starting scheduler service...');

    // Schedule daily cleanup at 3:00 AM (server time)
    // Cron format: minute hour day month day-of-week
    // '0 3 * * *' = Every day at 3:00 AM
    const cleanupTask = cron.schedule('0 3 * * *', async () => {
      logger.info('Running scheduled cleanup tasks...');

      try {
        const results = await cleanupService.runAllCleanupTasks();

        logger.info({
          unverifiedAccounts: results.unverifiedAccounts,
          emailVerifications: results.emailVerifications,
          total: results.totalCleaned
        }, 'Scheduled cleanup completed successfully');

      } catch (error) {
        logger.error({ err: error }, 'Scheduled cleanup failed');
      }
    }, {
      timezone: 'America/Argentina/Buenos_Aires' // Use your timezone
    });

    this.tasks.push(cleanupTask);
    this.isStarted = true;

    logger.info({
      taskCount: this.tasks.length,
      timezone: 'America/Argentina/Buenos_Aires',
      schedule: 'Daily at 3:00 AM'
    }, 'Scheduler service started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (!this.isStarted) {
      logger.warn('Scheduler service is not running');
      return;
    }

    logger.info('Stopping scheduler service...');

    for (const task of this.tasks) {
      task.stop();
    }

    this.tasks = [];
    this.isStarted = false;

    logger.info('Scheduler service stopped successfully');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    taskCount: number;
    tasks: Array<{ name: string; schedule: string; isRunning: boolean }>;
  } {
    return {
      isRunning: this.isStarted,
      taskCount: this.tasks.length,
      tasks: [
        {
          name: 'Daily Cleanup',
          schedule: 'Every day at 3:00 AM (America/Argentina/Buenos_Aires)',
          isRunning: this.tasks.length > 0 && this.isStarted
        }
      ]
    };
  }

  /**
   * Manually trigger cleanup (for testing or admin panel)
   */
  async triggerCleanupNow(): Promise<{
    unverifiedAccounts: number;
    emailVerifications: number;
    totalCleaned: number;
  }> {
    logger.info('Manual cleanup triggered');

    try {
      const results = await cleanupService.runAllCleanupTasks();

      logger.info({
        unverifiedAccounts: results.unverifiedAccounts,
        emailVerifications: results.emailVerifications,
        total: results.totalCleaned
      }, 'Manual cleanup completed successfully');

      return results;
    } catch (error) {
      logger.error({ err: error }, 'Manual cleanup failed');
      throw error;
    }
  }

  /**
   * Get cleanup statistics without actually cleaning
   */
  async getCleanupPreview(daysOld: number = 7): Promise<{
    unverifiedAccountsCount: number;
    expiredVerificationsCount: number;
  }> {
    return cleanupService.getCleanupStats(daysOld);
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
