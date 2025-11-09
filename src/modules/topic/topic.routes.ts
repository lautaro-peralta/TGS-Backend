// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { TopicController } from './topic.controller.js';
import { updateTopicSchema, createTopicSchema } from './topic.schema.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';

// ============================================================================
// ROUTER - Topic
// ============================================================================
export const topicRouter = Router();
const topicController = new TopicController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/topics:
 *   get:
 *     tags: [Topics]
 *     summary: Get all topics
 *     description: Retrieves a complete list of all discussion topics for Shelby council meetings
 *     responses:
 *       200:
 *         description: List of all topics
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
 *                         example: 1
 *                       description:
 *                         type: string
 *                         example: "Expansion into London territories"
 */
topicRouter.get('/', topicController.getAllTopics);

/**
 * @swagger
 * /api/topics/search:
 *   get:
 *     tags: [Topics]
 *     summary: Search topics
 *     description: Search topics by description with pagination
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term for topic description
 *         example: "race track"
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
 *                       id:
 *                         type: integer
 *                         example: 2
 *                       description:
 *                         type: string
 *                         example: "Legal horse race track operations"
 */
topicRouter.get('/search', topicController.searchTopics);

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     tags: [Topics]
 *     summary: Get topic by ID
 *     description: Retrieves detailed information about a specific discussion topic
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Topic details
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
 *                     description:
 *                       type: string
 *                       example: "Expansion into Camden Town territory"
 *       404:
 *         description: Topic not found
 */
topicRouter.get('/:id', topicController.getOneTopicById);

/**
 * @swagger
 * /api/topics:
 *   post:
 *     tags: [Topics]
 *     summary: Create new topic
 *     description: Creates a new discussion topic for council meetings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 description: Topic description
 *                 example: "Partnership with Alfie Solomons' bakery operations"
 *     responses:
 *       201:
 *         description: Topic created successfully
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
 *                       example: 5
 *                     description:
 *                       type: string
 *                       example: "Partnership with Alfie Solomons' bakery operations"
 *       400:
 *         description: Invalid request body - Description is required
 */
topicRouter.post(
  '/',
  validateWithSchema({ body: createTopicSchema }),
  topicController.createTopic
);

/**
 * @swagger
 * /api/topics/{id}:
 *   patch:
 *     tags: [Topics]
 *     summary: Update topic
 *     description: Partially updates a topic's description
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 example: "Revised expansion strategy for Camden Town"
 *     responses:
 *       200:
 *         description: Topic updated successfully
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
 *                     description:
 *                       type: string
 *                       example: "Revised expansion strategy for Camden Town"
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Topic not found
 */
topicRouter.patch(
  '/:id',
  validateWithSchema({ body: updateTopicSchema }),
  topicController.updateTopic
);

/**
 * @swagger
 * /api/topics/{id}:
 *   delete:
 *     tags: [Topics]
 *     summary: Delete topic
 *     description: Removes a topic from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Topic deleted successfully
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
 *                   example: "Topic deleted successfully"
 *       404:
 *         description: Topic not found
 */
topicRouter.delete('/:id', topicController.deleteTopic);
