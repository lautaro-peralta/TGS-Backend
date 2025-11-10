// ============================================================================
// CLEANUP SERVICE - Automated cleanup of expired and unverified data
// ============================================================================

import { orm } from '../db/orm.js';
import { User } from '../../modules/auth/user/user.entity.js';
import { EmailVerification, EmailVerificationStatus } from '../../modules/auth/emailVerification/emailVerification.entity.js';
import logger from '../utils/logger.js';

/**
 * Service for cleaning up expired and unverified data
 *
 * Features:
 * - Removes unverified accounts older than 7 days
 * - Removes expired email verifications
 * - Prevents email blocking by stale registrations
 *
 * Usage:
 * - Run daily via cron job or scheduler
 * - Can be manually triggered by admins
 */
export class CleanupService {

  /**
   * Clean up unverified user accounts older than specified days
   *
   * This prevents emails from being permanently blocked by incomplete registrations.
   * If someone registers with the wrong email, the account will be automatically
   * removed after the expiration period.
   *
   * @param daysOld - Number of days before considering account expired (default: 7)
   * @returns Number of accounts deleted
   */
  async cleanExpiredUnverifiedAccounts(daysOld: number = 7): Promise<number> {
    const em = orm.em.fork();

    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - daysOld);

      logger.info(
        { expirationDate: expirationDate.toISOString(), daysOld },
        'Starting cleanup of unverified accounts'
      );

      // Find unverified users older than expiration date
      const expiredUsers = await em.find(User, {
        emailVerified: false,
        createdAt: { $lt: expirationDate }
      });

      if (expiredUsers.length === 0) {
        logger.info('No expired unverified accounts found');
        return 0;
      }

      // Log accounts to be deleted
      const accountsInfo = expiredUsers.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt
      }));

      logger.warn(
        { count: expiredUsers.length, accounts: accountsInfo },
        'Deleting expired unverified accounts'
      );

      // Delete users and their related email verifications
      for (const user of expiredUsers) {
        // Delete related email verifications first
        await em.nativeDelete(EmailVerification, { email: user.email });

        // Delete user
        await em.remove(user);
      }

      await em.flush();

      logger.info(
        { deletedCount: expiredUsers.length },
        'Successfully cleaned up expired unverified accounts'
      );

      return expiredUsers.length;
    } catch (error) {
      logger.error(
        { err: error },
        'Error during cleanup of expired unverified accounts'
      );
      throw error;
    }
  }

  /**
   * Clean up expired email verifications
   *
   * Removes email verification records that have expired and are no longer valid.
   * This keeps the database clean and prevents clutter.
   *
   * @returns Number of verifications deleted
   */
  async cleanExpiredEmailVerifications(): Promise<number> {
    const em = orm.em.fork();

    try {
      const now = new Date();

      logger.info('Starting cleanup of expired email verifications');

      // Find expired verifications
      const expiredVerifications = await em.find(EmailVerification, {
        expiresAt: { $lt: now },
        status: EmailVerificationStatus.PENDING
      });

      if (expiredVerifications.length === 0) {
        logger.info('No expired email verifications found');
        return 0;
      }

      logger.warn(
        { count: expiredVerifications.length },
        'Deleting expired email verifications'
      );

      // Delete expired verifications
      for (const verification of expiredVerifications) {
        await em.remove(verification);
      }

      await em.flush();

      logger.info(
        { deletedCount: expiredVerifications.length },
        'Successfully cleaned up expired email verifications'
      );

      return expiredVerifications.length;
    } catch (error) {
      logger.error(
        { err: error },
        'Error during cleanup of expired email verifications'
      );
      throw error;
    }
  }

  /**
   * Run all cleanup tasks
   *
   * Executes all cleanup operations in sequence.
   * Safe to run frequently (e.g., daily).
   *
   * @returns Summary of cleanup operations
   */
  async runAllCleanupTasks(): Promise<{
    unverifiedAccounts: number;
    emailVerifications: number;
    totalCleaned: number;
  }> {
    logger.info('Starting all cleanup tasks');

    const unverifiedAccounts = await this.cleanExpiredUnverifiedAccounts();
    const emailVerifications = await this.cleanExpiredEmailVerifications();

    const summary = {
      unverifiedAccounts,
      emailVerifications,
      totalCleaned: unverifiedAccounts + emailVerifications
    };

    logger.info(
      summary,
      'All cleanup tasks completed successfully'
    );

    return summary;
  }

  /**
   * Get statistics about items that would be cleaned up
   *
   * Returns counts without actually deleting anything.
   * Useful for monitoring and reporting.
   *
   * @param daysOld - Number of days for unverified account threshold
   * @returns Statistics object
   */
  async getCleanupStats(daysOld: number = 7): Promise<{
    unverifiedAccountsCount: number;
    expiredVerificationsCount: number;
  }> {
    const em = orm.em.fork();

    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - daysOld);

      const unverifiedAccountsCount = await em.count(User, {
        emailVerified: false,
        createdAt: { $lt: expirationDate }
      });

      const expiredVerificationsCount = await em.count(EmailVerification, {
        expiresAt: { $lt: new Date() },
        status: EmailVerificationStatus.PENDING
      });

      return {
        unverifiedAccountsCount,
        expiredVerificationsCount
      };
    } catch (error) {
      logger.error({ err: error }, 'Error getting cleanup stats');
      throw error;
    }
  }
}

// Export singleton instance
export const cleanupService = new CleanupService();
