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
import { searchEntity, searchEntityByDate } from '../../shared/utils/search.util.js';


// ============================================================================
// CONTROLLER - Decision
// ============================================================================

/**
 * Controller for handling strategic decision-related operations.
 * @class DecisionController
 */
export class DecisionController {
  /**
   * Search strategic decisions with multiple criteria.
   *
   * Query params:
   * - q: string (min 2 chars) - Búsqueda de texto por descripción o topic
   * - by: 'description' | 'topic' (optional, default: 'description') - Tipo de búsqueda de texto
   * - date: ISO 8601 date - Búsqueda por fecha (startDate o endDate)
   * - type: 'exact' | 'before' | 'after' | 'between' - Tipo de búsqueda por fecha (requerido si viene date)
   * - dateField: 'startDate' | 'endDate' (optional, default: 'startDate') - Campo de fecha a filtrar
   * - endDate: ISO 8601 date - Fecha final (solo para type='between')
   *
   * Nota: Si viene 'date', se ignoran los parámetros 'q' y 'by'
   */
  async searchDecisions(req: Request, res: Response) {
    const em = orm.em.fork();

    const { date, by, dateField } = req.query as {
      date?: string;
      by?: 'description' | 'topic';
      dateField?: 'startDate' | 'endDate';
    };

    // Si viene 'date', delegar a búsqueda por fecha
    if (date) {
      const fieldToSearch = dateField === 'endDate' ? 'endDate' : 'startDate';
      return searchEntityByDate(req, res, StrategicDecision, fieldToSearch, {
        entityName: 'strategic decision',
        em,
        populate: ['topic'] as any,
      });
    }

    // Búsqueda de texto: por descripción o por topic
    const searchField = by === 'topic' ? 'topic.description' : 'description';

    return searchEntity(req, res, StrategicDecision, searchField, {
      entityName: 'strategic decision',
      em,
      populate: ['topic'] as any,
    });
  }
  /**
   * Retrieves all strategic decisions.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllDecisions(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch all strategic decisions with related topic
      // ──────────────────────────────────────────────────────────────────────
      const decisions = await em.find(
        StrategicDecision,
        {},
        { populate: ['topic'] }
      );
      const decisionsDTO = decisions.map((d) => d.toDTO());
      const message = ResponseUtil.generateListMessage(
        decisionsDTO.length,
        'strategic decision'
      );

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.successList(res, message, decisionsDTO);
    } catch (err) {
      console.error('Error getting strategic decisions:', err);
      return ResponseUtil.internalError(
        res,
        'Error getting strategic decisions',
        err
      );
    }
  }

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
      console.error('Error searching for strategic decision:', err);
      return ResponseUtil.internalError(
        res,
        'Error searching for strategic decision',
        err
      );
    }
  }

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
      console.error('Error creating strategic decision:', err);
      return ResponseUtil.internalError(
        res,
        'Error creating strategic decision',
        err
      );
    }
  }

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
      console.error('Error updating strategic decision:', err);
      return ResponseUtil.internalError(
        res,
        'Error updating strategic decision',
        err
      );
    }
  }

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
      console.error('Error deleting strategic decision:', err);
      return ResponseUtil.internalError(
        res,
        'Error deleting strategic decision',
        err
      );
    }
  }
}