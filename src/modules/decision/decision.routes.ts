// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { DecisionController } from './decision.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createDecisionSchema,
  updateDecisionSchema,
} from './decision.schema.js';

// ============================================================================
// ROUTER - Decision
// ============================================================================
export const decisionRouter = Router();
const decisionController = new DecisionController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/decisions
 * @desc    Get all strategic decisions.
 * @access  Public
 */

decisionRouter.get('/search', decisionController.searchDecisions);
decisionRouter.get('/', decisionController.getAllDecisions);

/**
 * @route   GET /api/decisions/:id
 * @desc    Get a single strategic decision by ID.
 * @access  Public
 */
decisionRouter.get('/:id', decisionController.getOneDecisionById);

/**
 * @route   POST /api/decisions
 * @desc    Create a new strategic decision.
 * @access  Public
 */
decisionRouter.post(
  '/',
  validateWithSchema({ body: createDecisionSchema }),
  decisionController.createDecision
);

/**
 * @route   PATCH /api/decisions/:id
 * @desc    Partially update a strategic decision by ID.
 * @access  Public
 */
decisionRouter.patch(
  '/:id',
  validateWithSchema({ body: updateDecisionSchema }),
  decisionController.updateDecision
);

/**
 * @route   DELETE /api/decisions/:id
 * @desc    Delete a strategic decision by ID.
 * @access  Public
 */
decisionRouter.delete('/:id', decisionController.deleteDecision);