// ============================================================================
// HEALTH ROUTES - Health check endpoints for monitoring and Kubernetes
// ============================================================================

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';
import {
  authMiddleware,
  rolesMiddleware,
} from '../../modules/auth/auth.middleware.js';
import { Role } from '../../modules/auth/user/user.entity.js';

export const healthRouter = Router();
const healthController = new HealthController();

// Basic health check - Quick status verification
healthRouter.get('/', healthController.basicHealth);

// Detailed health check - Comprehensive system status
healthRouter.get('/detailed', healthController.detailedHealth);

// Kubernetes readiness probe
healthRouter.get('/ready', healthController.readiness);

// Kubernetes liveness probe
healthRouter.get('/live', healthController.liveness);

// Email service debug (temporary)
// SECURITY: exposes email provider configuration (including a masked SendGrid
// API key prefix and can trigger sending test emails), so it is restricted to
// authenticated administrators. The other /health endpoints stay public so
// container orchestrators / uptime monitors can probe them.
healthRouter.get(
  '/email-debug',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  healthController.emailDebug
);
