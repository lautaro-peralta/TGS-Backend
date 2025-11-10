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
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Zone
// ============================================================================
export const zoneRouter = Router();
const zoneController = new ZoneController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/zones:
 *   get:
 *     tags: [Zones]
 *     summary: Get all zones
 *     description: Retrieves a list of all zones in Birmingham
 *     responses:
 *       200:
 *         description: List of zones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
zoneRouter.get('/', zoneController.getAllZones);

/**
 * @swagger
 * /api/zones/search:
 *   get:
 *     tags: [Zones]
 *     summary: Search zones
 *     description: Search zones by name or headquarters status with pagination
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term (for name) or "true"/"false" (for headquarters)
 *         example: "Small Heath"
 *       - in: query
 *         name: by
 *         schema:
 *           type: string
 *           enum: [name, headquarters]
 *         description: Field to search by
 *         example: "name"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
zoneRouter.get('/search', zoneController.searchZones);

/**
 * @swagger
 * /api/zones/{id}:
 *   get:
 *     tags: [Zones]
 *     summary: Get zone by ID
 *     description: Retrieves a specific zone by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Zone ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Zone found
 *       404:
 *         description: Zone not found
 */
zoneRouter.get('/:id', zoneController.getOneZoneById);

/**
 * @swagger
 * /api/zones:
 *   post:
 *     tags: [Zones]
 *     summary: Create a new zone
 *     description: Creates a new zone in Birmingham (Admin only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Small Heath"
 *               isHeadquarters:
 *                 type: boolean
 *                 default: false
 *                 example: true
 *     responses:
 *       201:
 *         description: Zone created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       409:
 *         description: Zone with this name already exists
 */
zoneRouter.post(
  '/',
  validateWithSchema({ body: createZoneSchema }),
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  zoneController.createZone
);

/**
 * @swagger
 * /api/zones/{id}:
 *   patch:
 *     tags: [Zones]
 *     summary: Update zone
 *     description: Partially updates a zone's information (Admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Zone ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Camden Town"
 *               isHeadquarters:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Zone updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Zone not found
 */
zoneRouter.patch(
  '/:id',
  validateWithSchema({ body: updateZoneSchema }),
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  zoneController.updateZone
);

/**
 * @swagger
 * /api/zones/{id}:
 *   delete:
 *     tags: [Zones]
 *     summary: Delete zone
 *     description: Removes a zone from the system (Admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Zone ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Zone deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Zone not found
 */
zoneRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  zoneController.deleteZone
);
