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
 * Acceso restringido a ADMIN mediante authMiddleware + rolesMiddleware.
 */
export const cleanupRouter = Router();
const cleanupController = new CleanupController();

// Todas las rutas de abajo son de administración: disparan borrados de
// cuentas y verificaciones, así que exigen sesión y rol ADMIN. Va aquí y no
// en el montaje de app.ts para que la garantía viaje con el router y no
// dependa de cómo se monte.
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
