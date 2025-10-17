// ============================================================================
// HEALTH ROUTES - Health check endpoints for monitoring and Kubernetes
// ============================================================================

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';

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
