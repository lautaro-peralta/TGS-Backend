import { Router } from 'express';
import { TopicController } from './topic.controller.js';
import { updateTopicSchema, createTopicSchema } from './topic.schema.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';

export const topicRouter = Router();
const themeController = new TopicController();

topicRouter.get('/', themeController.getAllTopics);

topicRouter.get('/:id', themeController.getOneTopicById);

topicRouter.post(
  '/',
  validateWithSchema({ body: createTopicSchema }),
  themeController.createTopic
);

topicRouter.patch(
  '/:id',
  validateWithSchema({ body: updateTopicSchema }),
  themeController.updateTopic
);

topicRouter.delete('/:id', themeController.deleteTopic);
