// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';
import { z } from 'zod';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import {
  authMiddleware,
  rolesMiddleware,
} from '../auth/auth.middleware.js';
import { ShelbyCouncilController } from './shelbyCouncil.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createShelbyCouncilSchema,
  updateShelbyCouncilSchema,
} from './shelbyCouncil.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - ConsejoShelby
// ============================================================================
export const shelbyCouncilRouter = Router();
const shelbyCouncilController = new ShelbyCouncilController();

/**
 * Zod schema for ID parameter validation.
 */
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/shelby-council/search:
 *   get:
 *     tags: [Shelby Council]
 *     summary: Search council records
 *     description: Search Shelby council membership records with filters for partner, decision, and date range
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: partnerDni
 *         schema:
 *           type: string
 *         description: Filter by partner DNI
 *         example: "23456789"
 *       - in: query
 *         name: decisionId
 *         schema:
 *           type: integer
 *         description: Filter by strategic decision ID
 *         example: 1
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter records from this date
 *         example: "1920-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter records until this date
 *         example: "1920-12-31"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results with pagination
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
 *                     properties:
 *                       id:
 *                         type: integer
 *                       partner:
 *                         type: object
 *                       decision:
 *                         type: object
 *                       joinDate:
 *                         type: string
 *                         format: date-time
 *                       role:
 *                         type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 */
shelbyCouncilRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  shelbyCouncilController.searchShelbyCouncil
);

/**
 * @swagger
 * /api/shelby-council:
 *   post:
 *     tags: [Shelby Council]
 *     summary: Create council record
 *     description: Registers a partner's participation in a strategic council decision
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partnerDni
 *               - decisionId
 *             properties:
 *               partnerDni:
 *                 type: string
 *                 description: DNI of the partner joining the council
 *                 example: "23456789"
 *               decisionId:
 *                 type: integer
 *                 description: ID of the strategic decision being discussed
 *                 example: 1
 *               joinDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optional - Date when partner joined this council
 *                 example: "1920-06-15T10:00:00Z"
 *               role:
 *                 type: string
 *                 description: Partner's role or responsibility in this council
 *                 example: "Financial Advisor"
 *               notes:
 *                 type: string
 *                 description: Additional notes about participation
 *                 example: "Expertise in betting operations and horse racing strategy"
 *     responses:
 *       201:
 *         description: Council record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     partnerDni:
 *                       type: string
 *                     decisionId:
 *                       type: integer
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       409:
 *         description: Council record already exists
 */
shelbyCouncilRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ body: createShelbyCouncilSchema }),
  shelbyCouncilController.createShelbyCouncil
);

/**
 * @swagger
 * /api/shelby-council:
 *   get:
 *     tags: [Shelby Council]
 *     summary: Get all council records
 *     description: Retrieves all Shelby council membership records
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all council records
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
 *                     properties:
 *                       id:
 *                         type: integer
 *                       partnerDni:
 *                         type: string
 *                       decisionId:
 *                         type: integer
 *                       joinDate:
 *                         type: string
 *                         format: date-time
 *                       role:
 *                         type: string
 *                       notes:
 *                         type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 */
shelbyCouncilRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  shelbyCouncilController.getAllConsejosShelby
);

/**
 * @swagger
 * /api/shelby-council/{id}:
 *   get:
 *     tags: [Shelby Council]
 *     summary: Get council record by ID
 *     description: Retrieves detailed information about a specific council membership
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Council record ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Council record details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     partnerDni:
 *                       type: string
 *                       example: "23456789"
 *                     partner:
 *                       type: object
 *                       properties:
 *                         dni:
 *                           type: string
 *                         name:
 *                           type: string
 *                           example: "Arthur Shelby"
 *                     decisionId:
 *                       type: integer
 *                       example: 1
 *                     decision:
 *                       type: object
 *                     joinDate:
 *                       type: string
 *                       format: date-time
 *                     role:
 *                       type: string
 *                       example: "Financial Advisor"
 *                     notes:
 *                       type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Council record not found
 */
shelbyCouncilRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ params: idParamSchema }),
  shelbyCouncilController.getOneShelbyCouncilById
);

/**
 * @swagger
 * /api/shelby-council/{id}:
 *   put:
 *     tags: [Shelby Council]
 *     summary: Update council record
 *     description: Updates a Shelby council membership record
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Council record ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               joinDate:
 *                 type: string
 *                 format: date-time
 *                 example: "1920-06-20T14:00:00Z"
 *               role:
 *                 type: string
 *                 example: "Strategic Operations Advisor"
 *               notes:
 *                 type: string
 *                 example: "Updated: Key contributor to London expansion strategy"
 *     responses:
 *       200:
 *         description: Council record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Council record not found
 */
shelbyCouncilRouter.put(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ params: idParamSchema, body: updateShelbyCouncilSchema }),
  shelbyCouncilController.updateConsejoShelby
);

/**
 * @swagger
 * /api/shelby-council/{id}:
 *   delete:
 *     tags: [Shelby Council]
 *     summary: Delete council record
 *     description: Removes a partner from a council decision record
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Council record ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Council record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Council record deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Council record not found
 */
shelbyCouncilRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ params: idParamSchema }),
  shelbyCouncilController.deleteShelbyCouncil
);
