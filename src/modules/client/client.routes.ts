// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { ClientController } from './client.controller.js';
import {
  updateClientSchema,
  createClientSchema,
} from './client.schema.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';

// ============================================================================
// ROUTER - Client
// ============================================================================
export const clientRouter = Router();
const clientController = new ClientController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/clients/search:
 *   get:
 *     tags: [Clients]
 *     summary: Search clients
 *     description: Search clients by various criteria
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
 *         description: List of matching clients
 *       401:
 *         description: Not authenticated
 */
clientRouter.get('/search', clientController.searchClients);

/**
 * @swagger
 * /api/clients:
 *   get:
 *     tags: [Clients]
 *     summary: Get all clients
 *     description: Retrieves a list of all registered clients
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of clients retrieved successfully
 *       401:
 *         description: Not authenticated
 */
clientRouter.get('/', clientController.getAllClients);

/**
 * @swagger
 * /api/clients/{dni}:
 *   get:
 *     tags: [Clients]
 *     summary: Get client by DNI
 *     description: Retrieves a single client by their DNI
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Client's DNI
 *         example: "12345678"
 *     responses:
 *       200:
 *         description: Client found
 *       404:
 *         description: Client not found
 *       401:
 *         description: Not authenticated
 */
clientRouter.get('/:dni', clientController.getOneClientByDni);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     tags: [Clients]
 *     summary: Create a new client
 *     description: Registers a new client in the system
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
 *             properties:
 *               dni:
 *                 type: string
 *                 example: "12345678"
 *               name:
 *                 type: string
 *                 example: "Arthur"
 *               surname:
 *                 type: string
 *                 example: "Shelby"
 *               address:
 *                 type: string
 *                 example: "Watery Lane, Birmingham"
 *               phone:
 *                 type: string
 *                 example: "+44 121 234 5678"
 *     responses:
 *       201:
 *         description: Client created successfully
 *       409:
 *         description: Client already exists
 *       401:
 *         description: Not authenticated
 */
clientRouter.post(
  '/',
  validateWithSchema({ body: createClientSchema }),
  clientController.createClient
);

/**
 * @swagger
 * /api/clients/{dni}:
 *   patch:
 *     tags: [Clients]
 *     summary: Update client
 *     description: Partially updates a client's information
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Client's DNI
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
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       404:
 *         description: Client not found
 *       401:
 *         description: Not authenticated
 */
clientRouter.patch(
  '/:dni',
  validateWithSchema({ body: updateClientSchema }),
  clientController.patchUpdateClient
);

/**
 * @swagger
 * /api/clients/{dni}:
 *   delete:
 *     tags: [Clients]
 *     summary: Delete client
 *     description: Removes a client from the system
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Client's DNI
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       401:
 *         description: Not authenticated
 */
clientRouter.delete('/:dni', clientController.deleteClient);