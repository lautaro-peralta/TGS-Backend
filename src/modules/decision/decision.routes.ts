import { Router } from 'express';
import { DecisionController } from './decision.controller.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import {
  crearDecisionSchema,
  actualizarDecisionSchema,
} from './decision.schema.js';

export const decisionRouter = Router();

const decisionController = new DecisionController();

decisionRouter.get('/', decisionController.getAllDecisiones);
decisionRouter.get('/:id', decisionController.getOneDecisionById);
decisionRouter.post(
  '/',
  validarConSchema({ body: crearDecisionSchema }),
  decisionController.createDecision
);
decisionRouter.patch(
  '/:id',
  validarConSchema({ body: actualizarDecisionSchema }),
  decisionController.updateDecision
);
decisionRouter.delete('/:id', decisionController.deleteDecision);
