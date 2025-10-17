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
 * @swagger
 * /api/decisions/search:
 *   get:
 *     tags: [Strategic Decisions]
 *     summary: Search strategic decisions
 *     description: Search for strategic decisions by various criteria
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
 *         description: Matching decisions found
 *       401:
 *         description: Not authenticated
 */
decisionRouter.get('/search', decisionController.searchDecisions);

/**
 * @swagger
 * /api/decisions:
 *   get:
 *     tags: [Strategic Decisions]
 *     summary: Get all strategic decisions
 *     description: Retrieves a list of all strategic decisions made by the Shelby Council
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of decisions retrieved successfully
 *       401:
 *         description: Not authenticated
 */
decisionRouter.get('/', decisionController.getAllDecisions);

/**
 * @swagger
 * /api/decisions/{id}:
 *   get:
 *     tags: [Strategic Decisions]
 *     summary: Get decision by ID
 *     description: Retrieves a single strategic decision by its ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Decision ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Decision found
 *       404:
 *         description: Decision not found
 *       401:
 *         description: Not authenticated
 */
decisionRouter.get('/:id', decisionController.getOneDecisionById);

/**
 * @swagger
 * /api/decisions:
 *   post:
 *     tags: [Strategic Decisions]
 *     summary: Create a new strategic decision
 *     description: Registers a new strategic decision in the Shelby Council
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Expansion to London"
 *               description:
 *                 type: string
 *                 example: "Strategic decision to expand operations to London territory"
 *               type:
 *                 type: string
 *                 enum: [EXPANSION, ALLIANCE, CONFLICT, INVESTMENT]
 *                 example: "EXPANSION"
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED, IMPLEMENTED]
 *                 example: "PENDING"
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                 example: "HIGH"
 *     responses:
 *       201:
 *         description: Decision created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Not authenticated
 */
decisionRouter.post(
  '/',
  validateWithSchema({ body: createDecisionSchema }),
  decisionController.createDecision
);

/**
 * @swagger
 * /api/decisions/{id}:
 *   patch:
 *     tags: [Strategic Decisions]
 *     summary: Update strategic decision
 *     description: Partially updates a strategic decision's information
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Decision ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       200:
 *         description: Decision updated successfully
 *       404:
 *         description: Decision not found
 *       401:
 *         description: Not authenticated
 */
decisionRouter.patch(
  '/:id',
  validateWithSchema({ body: updateDecisionSchema }),
  decisionController.updateDecision
);

/**
 * @swagger
 * /api/decisions/{id}:
 *   delete:
 *     tags: [Strategic Decisions]
 *     summary: Delete strategic decision
 *     description: Removes a strategic decision from the system
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Decision ID
 *     responses:
 *       200:
 *         description: Decision deleted successfully
 *       404:
 *         description: Decision not found
 *       401:
 *         description: Not authenticated
 */
decisionRouter.delete('/:id', decisionController.deleteDecision);