import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Client } from '../client/client.entity.js';
import { Product } from '../product/product.entity.js';
import { Authority } from '../authority/authority.entity.js';
import { Bribe } from '../bribe/bribe.entity.js';
import { User, Role } from '../auth/user.entity.js';
import { BasePersonEntity } from '../../shared/db/base.person.entity.js';
import { StrategicDecision } from './decision.entity.js';
import { Topic } from '../topic/topic.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const em = orm.em.fork();

export class DecisionController {
  async getAllDecisions(req: Request, res: Response) {
    try {
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

  async getOneDecisionById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const decision = await em.findOne(
        StrategicDecision,
        { id },
        { populate: ['topic'] }
      );
      if (!decision) {
        return ResponseUtil.notFound(res, 'Strategic decision', id);
      }

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

  async createDecision(req: Request, res: Response) {
    const { topicId, description, startDate, endDate } =
      res.locals.validated.body;

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

    let topic = await em.findOne(Topic, {
      id: topicId,
    });

    try {
      if (!topic) {
        return ResponseUtil.notFound(res, 'Topic', topicId);
      }
      const newDecision = em.create(StrategicDecision, {
        description,
        startDate,
        endDate,
        topic,
      });

      await em.persistAndFlush(newDecision);

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

  async updateDecision(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const decision = await em.findOne(
        StrategicDecision,
        { id },
        { populate: ['topic'] }
      );

      if (!decision) {
        return ResponseUtil.notFound(res, 'Strategic decision', id);
      }

      const updates = res.locals.validated.body;

      // If topicId was sent, we search for the topic and assign it
      if (updates.topicId) {
        const topic = await em.findOne(Topic, { id: updates.topicId });
        if (!topic) {
          return ResponseUtil.notFound(res, 'Topic', updates.topicId);
        }
        decision.topic = topic;
        delete updates.topicId; // we remove it to avoid conflict in assign
      }

      em.assign(decision, updates);
      await em.flush();

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

  async deleteDecision(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const decision = await em.findOne(
        StrategicDecision,
        { id },
        { populate: ['topic'] }
      );
      if (!decision) {
        return ResponseUtil.notFound(res, 'Strategic decision', id);
      }

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
