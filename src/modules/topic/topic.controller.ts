import { Request, Response } from 'express';
import { Topic } from './topic.entity.js';
import { orm } from '../../shared/db/orm.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const entityManager = orm.em.fork();

export class TopicController {
  async getAllTopics(req: Request, res: Response) {
    try {
      const topics = await entityManager.find(Topic, {});
      const topicsDTO = topics.map((topic) => topic.toDTO());
      const message = ResponseUtil.generateListMessage(
        topicsDTO.length,
        'topic'
      );

      return ResponseUtil.successList(res, message, topicsDTO);
    } catch (err) {
      console.error('Error getting topics:', err);
      return ResponseUtil.internalError(res, 'Error getting topics', err);
    }
  }

  async getOneTopicById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const topic = await entityManager.findOne(
        Topic,
        { id },
        { populate: ['decisions'] }
      );

      if (!topic) {
        return ResponseUtil.notFound(res, 'Topic', id);
      }

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

  async createTopic(req: Request, res: Response) {
    // Search by description
    const { description } = res.locals.validated.body;

    let topic = await entityManager.findOne(Topic, {
      description: description,
    });

    try {
      if (topic) {
        return ResponseUtil.conflict(
          res,
          'Topic already exists',
          'description'
        );
      }
      const newTopic = entityManager.create(Topic, {
        description,
      });

      await entityManager.persistAndFlush(newTopic);

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

  async updateTopic(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const topic = await entityManager.findOne(Topic, { id });
      if (!topic) {
        return ResponseUtil.notFound(res, 'Topic', id);
      }

      const updates = res.locals.validated.body;

      entityManager.assign(topic, updates);
      await entityManager.flush();

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

  async deleteTopic(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const topic = await entityManager.findOne(Topic, { id });
      if (!topic) {
        return ResponseUtil.notFound(res, 'Topic', id);
      }

      await entityManager.removeAndFlush(topic);
      return ResponseUtil.deleted(res, 'Topic deleted successfully');
    } catch (err) {
      console.error('Error deleting topic:', err);
      return ResponseUtil.internalError(res, 'Error deleting topic', err);
    }
  }
}
