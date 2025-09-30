// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { ZoneController } from './zone.controller.js';
import { rolesMiddleware, authMiddleware } from '../auth/auth.middleware.js';
import { updateZoneSchema, createZoneSchema } from './zone.schema.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import { Role } from '../auth/user.entity.js';

// ============================================================================
// ROUTER - Zone
// ============================================================================
export const zoneRouter = Router();
const zoneController = new ZoneController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/zones
 * @desc    Get all zones.
 * @access  Public
 */
zoneRouter.get('/', zoneController.getAllZones);

/**
 * @route   GET /api/zones/:id
 * @desc    Get a single zone by ID.
 * @access  Public
 */
zoneRouter.get('/:id', zoneController.getOneZoneById);

/**
 * @route   POST /api/zones
 * @desc    Create a new zone.
 * @access  Private (Admin only)
 */
zoneRouter.post(
  '/',
  validateWithSchema({ body: createZoneSchema }),
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  zoneController.createZone
);

/**
 * @route   PATCH /api/zones/:id
 * @desc    Partially update a zone by ID.
 * @access  Private (Admin only)
 */
zoneRouter.patch(
  '/:id',
  validateWithSchema({ body: updateZoneSchema }),
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  zoneController.updateZone
);

/**
 * @route   DELETE /api/zones/:id
 * @desc    Delete a zone by ID.
 * @access  Private (Admin only)
 */
zoneRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  zoneController.deleteZone
);