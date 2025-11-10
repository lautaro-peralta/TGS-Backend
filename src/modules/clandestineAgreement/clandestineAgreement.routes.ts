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
import { ClandestineAgreementController } from './clandestineAgreement.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createClandestineAgreementSchema,
  updateClandestineAgreementSchema,
} from './clandestineAgreement.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - ClandestineAgreement
// ============================================================================
export const clandestineAgreementRouter = Router();
const clandestineAgreementController = new ClandestineAgreementController();

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
 * /api/clandestine-agreements/search:
 *   get:
 *     tags: [Clandestine Agreements]
 *     summary: Search secret agreements
 *     description: Search clandestine agreements between Shelby council and authorities with filters for status, parties, and dates
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: shelbyCouncilId
 *         schema:
 *           type: integer
 *         description: Filter by Shelby council ID
 *         example: 1
 *       - in: query
 *         name: adminDni
 *         schema:
 *           type: string
 *         description: Filter by admin DNI
 *         example: "34567890"
 *       - in: query
 *         name: authorityDni
 *         schema:
 *           type: string
 *         description: Filter by authority DNI
 *         example: "12345678"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, EXPIRED, BROKEN, FULFILLED]
 *         description: Filter by agreement status
 *         example: "ACTIVE"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter agreements from this date
 *         example: "1920-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter agreements until this date
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
 *                       shelbyCouncil:
 *                         type: object
 *                       admin:
 *                         type: object
 *                       authority:
 *                         type: object
 *                       status:
 *                         type: string
 *                       agreementDate:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 */
clandestineAgreementRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]),
  clandestineAgreementController.searchClandestineAgreements
);

/**
 * @swagger
 * /api/clandestine-agreements:
 *   post:
 *     tags: [Clandestine Agreements]
 *     summary: Create secret agreement
 *     description: Creates a new clandestine agreement between a Shelby council decision, an admin, and an authority
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shelbyCouncilId
 *               - adminDni
 *               - authorityDni
 *             properties:
 *               shelbyCouncilId:
 *                 type: integer
 *                 description: ID of the Shelby council decision
 *                 example: 1
 *               adminDni:
 *                 type: string
 *                 description: DNI of the admin facilitating the agreement
 *                 example: "34567890"
 *               authorityDni:
 *                 type: string
 *                 description: DNI of the authority involved
 *                 example: "12345678"
 *               agreementDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optional - Date when agreement was made
 *                 example: "1920-06-15T22:00:00Z"
 *               description:
 *                 type: string
 *                 description: Secret terms and conditions of the agreement
 *                 example: "Inspector Campbell agrees to overlook certain Birmingham operations in exchange for information on communist activities"
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, EXPIRED, BROKEN, FULFILLED]
 *                 default: ACTIVE
 *                 example: "ACTIVE"
 *     responses:
 *       201:
 *         description: Clandestine agreement created successfully
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
 *                     shelbyCouncilId:
 *                       type: integer
 *                     adminDni:
 *                       type: string
 *                     authorityDni:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       409:
 *         description: Agreement already exists
 */
clandestineAgreementRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ body: createClandestineAgreementSchema }),
  clandestineAgreementController.createClandestineAgreement
);

/**
 * @swagger
 * /api/clandestine-agreements:
 *   get:
 *     tags: [Clandestine Agreements]
 *     summary: Get all agreements
 *     description: Retrieves all clandestine agreements in the system
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all clandestine agreements
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
 *                       shelbyCouncilId:
 *                         type: integer
 *                       adminDni:
 *                         type: string
 *                       authorityDni:
 *                         type: string
 *                       agreementDate:
 *                         type: string
 *                         format: date-time
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 */
clandestineAgreementRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]),
  clandestineAgreementController.getAllClandestineAgreements
);

/**
 * @swagger
 * /api/clandestine-agreements/{id}:
 *   get:
 *     tags: [Clandestine Agreements]
 *     summary: Get agreement by ID
 *     description: Retrieves detailed information about a specific clandestine agreement
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Clandestine agreement ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Clandestine agreement details
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
 *                     shelbyCouncilId:
 *                       type: integer
 *                       example: 1
 *                     shelbyCouncil:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         decision:
 *                           type: object
 *                     adminDni:
 *                       type: string
 *                       example: "34567890"
 *                     admin:
 *                       type: object
 *                       properties:
 *                         dni:
 *                           type: string
 *                         name:
 *                           type: string
 *                           example: "Thomas Shelby"
 *                     authorityDni:
 *                       type: string
 *                       example: "12345678"
 *                     authority:
 *                       type: object
 *                       properties:
 *                         dni:
 *                           type: string
 *                         name:
 *                           type: string
 *                           example: "Inspector Campbell"
 *                         rank:
 *                           type: integer
 *                     agreementDate:
 *                       type: string
 *                       format: date-time
 *                       example: "1920-06-15T22:00:00Z"
 *                     description:
 *                       type: string
 *                       example: "Mutual protection agreement for Birmingham operations"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Clandestine agreement not found
 */
clandestineAgreementRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER, Role.AUTHORITY]),
  validateWithSchema({ params: idParamSchema }),
  clandestineAgreementController.getOneClandestineAgreementById
);

/**
 * @swagger
 * /api/clandestine-agreements/{id}:
 *   put:
 *     tags: [Clandestine Agreements]
 *     summary: Update agreement
 *     description: Updates a clandestine agreement's details and status
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Clandestine agreement ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agreementDate:
 *                 type: string
 *                 format: date-time
 *                 example: "1920-06-20T23:00:00Z"
 *               description:
 *                 type: string
 *                 example: "Updated terms: Extended protection for six additional months"
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, EXPIRED, BROKEN, FULFILLED]
 *                 example: "FULFILLED"
 *     responses:
 *       200:
 *         description: Clandestine agreement updated successfully
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
 *         description: Clandestine agreement not found
 */
clandestineAgreementRouter.put(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ params: idParamSchema, body: updateClandestineAgreementSchema }),
  clandestineAgreementController.updateClandestineAgreement
);

/**
 * @swagger
 * /api/clandestine-agreements/{id}:
 *   delete:
 *     tags: [Clandestine Agreements]
 *     summary: Delete agreement
 *     description: Removes a clandestine agreement from the system (terminates the secret pact)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Clandestine agreement ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Clandestine agreement deleted successfully
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
 *                   example: "Clandestine agreement deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Clandestine agreement not found
 */
clandestineAgreementRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ params: idParamSchema }),
  clandestineAgreementController.deleteClandestineAgreement
);
