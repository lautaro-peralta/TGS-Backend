import { Router } from 'express';
import { DecisionController } from './decision.controller.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import {
  createDecisionSchema,
  updateDecisionSchema,
} from './decision.schema.js';

export const decisionRouter = Router();

const decisionController = new DecisionController();

decisionRouter.get('/', decisionController.getAllDecisions);
decisionRouter.get('/:id', decisionController.getOneDecisionById);
decisionRouter.post(
  '/',
  validateWithSchema({ body: createDecisionSchema }),
  decisionController.createDecision
);
decisionRouter.patch(
  '/:id',
  validateWithSchema({ body: updateDecisionSchema }),
  decisionController.updateDecision
);
decisionRouter.delete('/:id', decisionController.deleteDecision);
