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
 * @route   GET /api/clients
 * @desc    Get all clients.
 * @access  Public
 */

clientRouter.get('/search', clientController.searchClients);

clientRouter.get('/', clientController.getAllClients);

/**
 * @route   GET /api/clients/:dni
 * @desc    Get a single client by DNI.
 * @access  Public
 */
clientRouter.get('/:dni', clientController.getOneClientByDni);

/**
 * @route   POST /api/clients
 * @desc    Create a new client.
 * @access  Public
 */
clientRouter.post(
  '/',
  validateWithSchema({ body: createClientSchema }),
  clientController.createClient
);

/**
 * @route   PATCH /api/clients/:dni
 * @desc    Partially update a client by DNI.
 * @access  Public
 */
clientRouter.patch(
  '/:dni',
  validateWithSchema({ body: updateClientSchema }),
  clientController.patchUpdateClient
);

/**
 * @route   DELETE /api/clients/:dni
 * @desc    Delete a client by DNI.
 * @access  Public
 */
clientRouter.delete('/:dni', clientController.deleteClient);