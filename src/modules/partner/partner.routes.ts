// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { PartnerController } from './partner.controller.js';
import {
  updatePartnerSchema,
  createPartnerSchema,
} from './partner.schema.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';

// ============================================================================
// ROUTER - Partner
// ============================================================================
export const partnerRouter = Router();
const partnerController = new PartnerController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/partners/search:
 *   get:
 *     tags: [Partners]
 *     summary: Search partners
 *     description: Search for partners by name, email, or DNI
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Matching partners found
 *       401:
 *         description: Not authenticated
 */
partnerRouter.get('/search', partnerController.searchPartners);

/**
 * @swagger
 * /api/partners:
 *   get:
 *     tags: [Partners]
 *     summary: Get all partners
 *     description: Retrieves a list of all business partners
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of partners retrieved successfully
 *       401:
 *         description: Not authenticated
 */
partnerRouter.get('/', partnerController.getAllPartners);

/**
 * @swagger
 * /api/partners/{dni}:
 *   get:
 *     tags: [Partners]
 *     summary: Get partner by DNI
 *     description: Retrieves a single partner by their DNI
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Partner's DNI
 *         example: "87654321"
 *     responses:
 *       200:
 *         description: Partner found
 *       404:
 *         description: Partner not found
 *       401:
 *         description: Not authenticated
 */
partnerRouter.get('/:dni', partnerController.getPartnerByDni);

/**
 * @swagger
 * /api/partners:
 *   post:
 *     tags: [Partners]
 *     summary: Create a new partner
 *     description: Registers a new business partner in the system
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dni
 *               - name
 *               - surname
 *               - email
 *             properties:
 *               dni:
 *                 type: string
 *                 example: "87654321"
 *               name:
 *                 type: string
 *                 example: "Alfie"
 *               surname:
 *                 type: string
 *                 example: "Solomons"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "alfie@solomons.com"
 *               phone:
 *                 type: string
 *                 example: "+44 20 7946 0958"
 *               company:
 *                 type: string
 *                 example: "Solomons Bakery"
 *     responses:
 *       201:
 *         description: Partner created successfully
 *       409:
 *         description: Partner already exists
 *       401:
 *         description: Not authenticated
 */
partnerRouter.post(
  '/',
  validateWithSchema({ body: createPartnerSchema }),
  partnerController.createPartner
);

/**
 * @swagger
 * /api/partners/{dni}:
 *   patch:
 *     tags: [Partners]
 *     summary: Update partner
 *     description: Partially updates a partner's information
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Partner's DNI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               company:
 *                 type: string
 *     responses:
 *       200:
 *         description: Partner updated successfully
 *       404:
 *         description: Partner not found
 *       401:
 *         description: Not authenticated
 */
partnerRouter.patch(
  '/:dni',
  validateWithSchema({ body: updatePartnerSchema }),
  partnerController.updatePartner
);

/**
 * @swagger
 * /api/partners/{dni}:
 *   delete:
 *     tags: [Partners]
 *     summary: Delete partner
 *     description: Removes a partner from the system
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Partner's DNI
 *     responses:
 *       200:
 *         description: Partner deleted successfully
 *       404:
 *         description: Partner not found
 *       401:
 *         description: Not authenticated
 */
partnerRouter.delete('/:dni', partnerController.deletePartner);

/**
 * @swagger
 * /api/partners/migrate/roles:
 *   post:
 *     tags: [Partners]
 *     summary: Migrate partner roles (Admin only)
 *     description: Assigns PARTNER role to all users who have an associated partner entity but don't have the role yet. This is a one-time migration endpoint.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Migration completed successfully
 *       401:
 *         description: Not authenticated
 */
partnerRouter.post('/migrate/roles', partnerController.migratePartnerRoles);
