// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { StrategicDecision } from './decision.entity.js';
import { Topic } from '../topic/topic.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { searchDecisionsSchema } from './decision.schema.js';
import { DateFilter, EntityFilters } from '../../shared/types/common.types.js';


// ============================================================================
// CONTROLLER - Decision
// ============================================================================

/**
 * Controller for handling strategic decision-related operations.
 * @class DecisionController
 */
export class DecisionController {

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search strategic decisions with multiple criteria.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by description or topic
   * - by: 'description' | 'topic' (optional, default: 'description') - Search field
   * - date: ISO 8601 date - Filter by date (startDate or endDate)
   * - type: 'exact' | 'before' | 'after' | 'between' - Date search type (required if date is provided)
   * - dateField: 'startDate' | 'endDate' (optional, default: 'startDate') - Date field to filter
   * - endDate: ISO 8601 date - End date (only for type='between')
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchDecisions(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchDecisionsSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPagination(req, res, StrategicDecision, {
      entityName: 'strategic decision',
      em,
      searchFields: (validated.by === 'topic') ? 'topic.description' : 'description',
      buildFilters: () => {
        const { date, type, endDate } = validated;
        const filters: EntityFilters = {};

        // Filter by date (already validated by Zod)
        if (date && type) {
          const parsedDate = new Date(date);
          const startOfDay = new Date(parsedDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(parsedDate);
          endOfDay.setHours(23, 59, 59, 999);

          switch (type) {
            case 'exact':
              filters.startDate = { $gte: startOfDay, $lte: endOfDay };
              break;
            case 'before':
              filters.startDate = { $lte: endOfDay };
              break;
            case 'after':
              filters.startDate = { $gte: startOfDay };
              break;
            case 'between':
              if (endDate) {
                const parsedEndDate = new Date(endDate);
                const endOfEndDate = new Date(parsedEndDate);
                endOfEndDate.setHours(23, 59, 59, 999);
                filters.startDate = { $gte: startOfDay, $lte: endOfEndDate };
              }
              break;
          }
        }

        return filters;
      },
      populate: ['topic'] as any,
      orderBy: { startDate: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new strategic decision.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createDecision(req: Request, res: Response) {
    const em = orm.em.fork();
    const { topicId, description, startDate, endDate } =
      res.locals.validated.body;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Check for existing decision with the same description
      // ──────────────────────────────────────────────────────────────────────
      let decision = await em.findOne(StrategicDecision, {
        description: description,
      });

      if (decision) {
        return ResponseUtil.conflict(
          res,
          'A strategic decision with that description already exists',
          'description'
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Find the related topic
      // ──────────────────────────────────────────────────────────────────────
      let topic = await em.findOne(Topic, {
        id: topicId,
      });

      if (!topic) {
        return ResponseUtil.notFound(res, 'Topic', topicId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create and persist the new strategic decision
      // ──────────────────────────────────────────────────────────────────────
      const newDecision = em.create(StrategicDecision, {
        description,
        startDate,
        endDate,
        topic,
      });

      await em.persistAndFlush(newDecision);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.created(
        res,
        'Strategic decision created successfully',
        newDecision.toDTO()
      );
    } catch (err: any) {
      logger.error({ err }, 'Error creating strategic decision');
      return ResponseUtil.internalError(
        res,
        'Error creating strategic decision',
        err
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all strategic decisions with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllDecisions(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, StrategicDecision, {
      entityName: 'strategic decision',
      em,
      buildFilters: () => ({}),
      populate: ['topic'] as any,
      orderBy: { startDate: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single strategic decision by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneDecisionById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract decision ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch strategic decision by ID with related topic
      // ──────────────────────────────────────────────────────────────────────
      const decision = await em.findOne(
        StrategicDecision,
        { id },
        { populate: ['topic'] }
      );
      if (!decision) {
        return ResponseUtil.notFound(res, 'Strategic decision', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Strategic decision found successfully',
        decision.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error searching for strategic decision');
      return ResponseUtil.internalError(
        res,
        'Error searching for strategic decision',
        err
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates an existing strategic decision.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async updateDecision(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract decision ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch the strategic decision
      // ──────────────────────────────────────────────────────────────────────
      const decision = await em.findOne(
        StrategicDecision,
        { id },
        { populate: ['topic'] }
      );

      if (!decision) {
        return ResponseUtil.notFound(res, 'Strategic decision', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply updates
      // ──────────────────────────────────────────────────────────────────────
      const updates = res.locals.validated.body;

      if (updates.topicId) {
        const topic = await em.findOne(Topic, { id: updates.topicId });
        if (!topic) {
          return ResponseUtil.notFound(res, 'Topic', updates.topicId);
        }
        decision.topic = topic;
        delete updates.topicId;
      }

      em.assign(decision, updates);
      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        'Strategic decision updated successfully',
        decision.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error updating strategic decision');
      return ResponseUtil.internalError(
        res,
        'Error updating strategic decision',
        err
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a strategic decision by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteDecision(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract decision ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch the strategic decision
      // ──────────────────────────────────────────────────────────────────────
      const decision = await em.findOne(
        StrategicDecision,
        { id },
        { populate: ['topic'] }
      );
      if (!decision) {
        return ResponseUtil.notFound(res, 'Strategic decision', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the strategic decision
      // ──────────────────────────────────────────────────────────────────────
      await em.removeAndFlush(decision);
      return ResponseUtil.deleted(
        res,
        'Strategic decision deleted successfully'
      );
    } catch (err) {
      logger.error({ err }, 'Error deleting strategic decision');
      return ResponseUtil.internalError(
        res,
        'Error deleting strategic decision',
        err
      );
    }
  }
}