// ============================================================================
// CLEANUP ROUTES - Admin routes for cleanup operations
// ============================================================================

import { Router } from 'express';
import { CleanupController } from '../controllers/cleanup.controller.js';

/**
 * Cleanup and scheduler administration routes
 * Note: These routes should be protected with admin authentication
 */
export const cleanupRouter = Router();
const cleanupController = new CleanupController();

// Get scheduler status and information
cleanupRouter.get('/scheduler/status', cleanupController.getSchedulerStatus.bind(cleanupController));

// Get cleanup preview (what would be cleaned without actually doing it)
cleanupRouter.get('/preview', cleanupController.getCleanupPreview.bind(cleanupController));

// Manually trigger complete cleanup now
cleanupRouter.post('/trigger', cleanupController.triggerCleanup.bind(cleanupController));

// Clean expired unverified accounts only
cleanupRouter.post('/accounts', cleanupController.cleanExpiredAccounts.bind(cleanupController));

// Clean expired email verifications only
cleanupRouter.post('/verifications', cleanupController.cleanExpiredVerifications.bind(cleanupController));
