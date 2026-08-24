// ============================================================================
// CLEANUP ROUTES - Admin routes for cleanup operations
// ============================================================================

import { Router } from 'express';
import {
  authMiddleware,
  rolesMiddleware,
} from '../../modules/auth/auth.middleware.js';
import { Role } from '../../modules/auth/user/user.entity.js';
import { CleanupController } from '../controllers/cleanup.controller.js';

/**
 * Cleanup and scheduler administration routes
 *
 * SECURITY: These endpoints trigger destructive maintenance operations
 * (deleting expired accounts and verifications, forcing cleanup runs). They
 * must only be reachable by authenticated administrators. The guard is applied
 * at the router level so the protection travels with the router regardless of
 * where it is mounted and cannot be accidentally bypassed.
 */
export const cleanupRouter = Router();
const cleanupController = new CleanupController();

// Require an authenticated ADMIN for every route in this router
cleanupRouter.use(authMiddleware, rolesMiddleware([Role.ADMIN]));

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