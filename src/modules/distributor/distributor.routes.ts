// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { DistributorController } from './distributor.controller.js';
import {
  createDistributorSchema,
  updateDistributorSchema,
} from './distributor.schema.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';

// ============================================================================
// ROUTER - Distributor
// ============================================================================
export const distributorRouter = Router();
const distributorController = new DistributorController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/distributors/search:
 *   get:
 *     tags: [Distributors]
 *     summary: Search distributors
 *     description: Search distributors by name or zone with pagination
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term
 *         example: "Arthur Shelby"
 *       - in: query
 *         name: by
 *         schema:
 *           type: string
 *           enum: [name, zone]
 *           default: name
 *         description: Search field
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
 *                       dni:
 *                         type: string
 *                         example: "45678901"
 *                       name:
 *                         type: string
 *                         example: "Arthur Shelby"
 *                       address:
 *                         type: string
 *                         example: "Watery Lane, Small Heath"
 *                       phone:
 *                         type: string
 *                         example: "+44 121 303 1920"
 *                       email:
 *                         type: string
 *                         example: "arthur@shelbyltd.co.uk"
 *                       zone:
 *                         type: object
 */
distributorRouter.get('/search', distributorController.searchDistributors);

/**
 * @swagger
 * /api/distributors:
 *   get:
 *     tags: [Distributors]
 *     summary: Get all distributors
 *     description: Retrieves a complete list of all distributors
 *     responses:
 *       200:
 *         description: List of all distributors
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
 *                       dni:
 *                         type: string
 *                       name:
 *                         type: string
 *                       address:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       email:
 *                         type: string
 *                       products:
 *                         type: array
 *                         items:
 *                           type: object
 *                       zone:
 *                         type: object
 */
distributorRouter.get('/', distributorController.getAllDistributors);

/**
 * @swagger
 * /api/distributors/{dni}:
 *   get:
 *     tags: [Distributors]
 *     summary: Get distributor by DNI
 *     description: Retrieves detailed information about a specific distributor including their products and zone
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Distributor's DNI
 *         example: "45678901"
 *     responses:
 *       200:
 *         description: Distributor details
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
 *                     dni:
 *                       type: string
 *                       example: "45678901"
 *                     name:
 *                       type: string
 *                       example: "Arthur Shelby"
 *                     address:
 *                       type: string
 *                       example: "Watery Lane, Small Heath"
 *                     phone:
 *                       type: string
 *                       example: "+44 121 303 1920"
 *                     email:
 *                       type: string
 *                       example: "arthur@shelbyltd.co.uk"
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                     zone:
 *                       type: object
 *       404:
 *         description: Distributor not found
 */
distributorRouter.get('/:dni', distributorController.getOneDistributorByDni);

/**
 * @swagger
 * /api/distributors:
 *   post:
 *     tags: [Distributors]
 *     summary: Create new distributor
 *     description: Register a new distributor in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dni
 *               - name
 *               - address
 *               - phone
 *               - email
 *               - zoneId
 *             properties:
 *               dni:
 *                 type: string
 *                 minLength: 1
 *                 example: "56789012"
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: "John Shelby"
 *               address:
 *                 type: string
 *                 minLength: 1
 *                 example: "Charlie Strong's Yard, Birmingham"
 *               phone:
 *                 type: string
 *                 minLength: 6
 *                 example: "+44 121 555 1920"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@shelbyltd.co.uk"
 *               productsIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of product IDs to associate
 *                 example: [1, 2, 3]
 *               zoneId:
 *                 type: string
 *                 description: Zone ID where distributor operates
 *                 example: "1"
 *     responses:
 *       201:
 *         description: Distributor created successfully
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
 *       409:
 *         description: Distributor with this DNI already exists
 */
distributorRouter.post(
  '/',
  validateWithSchema({ body: createDistributorSchema }),
  distributorController.createDistributor
);

/**
 * @swagger
 * /api/distributors/{dni}:
 *   patch:
 *     tags: [Distributors]
 *     summary: Update distributor
 *     description: Partially updates a distributor's information
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Distributor's DNI
 *         example: "45678901"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Arthur Shelby Sr."
 *               address:
 *                 type: string
 *                 example: "6 Watery Lane, Small Heath, Birmingham"
 *               phone:
 *                 type: string
 *                 example: "+44 121 303 1921"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "arthur.shelby@shelbyltd.co.uk"
 *               productsIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 4, 5]
 *               zoneId:
 *                 type: string
 *                 example: "2"
 *     responses:
 *       200:
 *         description: Distributor updated successfully
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
 *       404:
 *         description: Distributor not found
 */
distributorRouter.patch(
  '/:dni',
  validateWithSchema({ body: updateDistributorSchema }),
  distributorController.patchUpdateDistributor
);

/**
 * @swagger
 * /api/distributors/{dni}:
 *   delete:
 *     tags: [Distributors]
 *     summary: Delete distributor
 *     description: Removes a distributor from the system
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Distributor's DNI
 *         example: "45678901"
 *     responses:
 *       200:
 *         description: Distributor deleted successfully
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
 *                   example: "Distributor deleted successfully"
 *       404:
 *         description: Distributor not found
 */
distributorRouter.delete('/:dni', distributorController.deleteDistributor);
