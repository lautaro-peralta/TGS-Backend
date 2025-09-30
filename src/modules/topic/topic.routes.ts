// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { TopicController } from './topic.controller.js';
import { updateTopicSchema, createTopicSchema } from './topic.schema.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';

// ============================================================================
// ROUTER - Topic
// ============================================================================
export const topicRouter = Router();
const topicController = new TopicController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/topics
 * @desc    Get all topics.
 * @access  Public
 */
topicRouter.get('/', topicController.getAllTopics);

/**
 * @route   GET /api/topics/:id
 * @desc    Get a single topic by ID.
 * @access  Public
 */
topicRouter.get('/:id', topicController.getOneTopicById);

/**
 * @route   POST /api/topics
 * @desc    Create a new topic.
 * @access  Public
 */
topicRouter.post(
  '/',
  validateWithSchema({ body: createTopicSchema }),
  topicController.createTopic
);

/**
 * @route   PATCH /api/topics/:id
 * @desc    Partially update a topic by ID.
 * @access  Public
 */
topicRouter.patch(
  '/:id',
  validateWithSchema({ body: updateTopicSchema }),
  topicController.updateTopic
);

/**
 * @route   DELETE /api/topics/:id
 * @desc    Delete a topic by ID.
 * @access  Public
 */
topicRouter.delete('/:id', topicController.deleteTopic);