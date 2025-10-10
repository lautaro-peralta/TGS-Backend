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
 * @route   GET /api/distributors
 * @desc    Get all distributors.
 * @access  Public
 */
distributorRouter.get('/search', distributorController.searchDistributors);

distributorRouter.get('/search', distributorController.searchDistributors);
distributorRouter.get('/', distributorController.getAllDistributors);

/**
 * @route   GET /api/distributors/:dni
 * @desc    Get a single distributor by DNI.
 * @access  Public
 */
distributorRouter.get('/:dni', distributorController.getOneDistributorByDni);

/**
 * @route   POST /api/distributors
 * @desc    Create a new distributor.
 * @access  Public
 */
distributorRouter.post(
  '/',
  validateWithSchema({ body: createDistributorSchema }),
  distributorController.createDistributor
);

/**
 * @route   PATCH /api/distributors/:dni
 * @desc    Partially update a distributor by DNI.
 * @access  Public
 */
distributorRouter.patch(
  '/:dni',
  validateWithSchema({ body: updateDistributorSchema }),
  distributorController.patchUpdateDistributor
);

/**
 * @route   DELETE /api/distributors/:dni
 * @desc    Delete a distributor by DNI.
 * @access  Public
 */
distributorRouter.delete('/:dni', distributorController.deleteDistributor);