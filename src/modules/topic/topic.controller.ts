// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { Topic } from './topic.entity.js';
import { orm } from '../../shared/db/orm.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import { searchTopicsSchema } from './topic.schema.js';


// ============================================================================
// CONTROLLER - Topic
// ============================================================================

/**
 * Controller for handling topic-related operations.
 * @class TopicController
 */
export class TopicController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search topics by description.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by description
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  async searchTopics(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchTopicsSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPagination(req, res, Topic, {
      entityName: 'topic',
      em,
      searchFields: 'description',
      buildFilters: () => ({}),
      orderBy: { description: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new topic.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  async createTopic(req: Request, res: Response) {
    const em = orm.em.fork();
    const { description } = res.locals.validated.body;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Check for existing topic with the same description
      // ──────────────────────────────────────────────────────────────────────
      let topic = await em.findOne(Topic, {
        description: description,
      });

      if (topic) {
        return ResponseUtil.conflict(
          res,
          'Topic already exists',
          'description'
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create and persist the new topic
      // ──────────────────────────────────────────────────────────────────────
      const newTopic = em.create(Topic, {
        description,
      });

      await em.persistAndFlush(newTopic);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.created(
        res,
        'Topic created successfully',
        newTopic.toDTO()
      );
    } catch (err: any) {
      console.error('Error creating topic:', err);
      return ResponseUtil.internalError(res, 'Error creating topic', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all topics with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllTopics(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Topic, {
      entityName: 'topic',
      em,
      buildFilters: () => ({}),
      orderBy: { description: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single topic by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneTopicById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract topic ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch topic by ID with related decisions
      // ──────────────────────────────────────────────────────────────────────
      const topic = await em.findOne(
        Topic,
        { id },
        { populate: ['decisions'] }
      );

      if (!topic) {
        return ResponseUtil.notFound(res, 'Topic', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Topic found successfully',
        topic.toDetailedDTO()
      );
    } catch (err) {
      console.error('Error searching for topic:', err);
      return ResponseUtil.internalError(res, 'Error searching for topic', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates an existing topic.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async updateTopic(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract topic ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch the topic
      // ──────────────────────────────────────────────────────────────────────
      const topic = await em.findOne(Topic, { id });
      if (!topic) {
        return ResponseUtil.notFound(res, 'Topic', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply updates
      // ──────────────────────────────────────────────────────────────────────
      const updates = res.locals.validated.body;
      em.assign(topic, updates);
      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        'Topic updated successfully',
        topic.toDTO()
      );
    } catch (err) {
      console.error('Error updating topic:', err);
      return ResponseUtil.internalError(res, 'Error updating topic', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a topic by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteTopic(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract topic ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch the topic with decisions
      // ──────────────────────────────────────────────────────────────────────
      const topic = await em.findOne(Topic, { id }, { populate: ['decisions'] });
      if (!topic) {
        return ResponseUtil.notFound(res, 'Topic', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Check for associated decisions
      // ──────────────────────────────────────────────────────────────────────
      if (topic.decisions.length > 0) {
        return ResponseUtil.error(
          res,
          `Cannot delete topic "${topic.description}" because it has ${topic.decisions.length} strategic decision(s) associated with it. Please delete or reassign the decisions first.`,
          400
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the topic
      // ──────────────────────────────────────────────────────────────────────
      await em.removeAndFlush(topic);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(res, 'Topic deleted successfully');
    } catch (err) {
      console.error('Error deleting topic:', err);
      return ResponseUtil.internalError(res, 'Error deleting topic', err);
    }
  }
}