import { Router } from 'express';
import { DistribuidorController } from './distribuidor.controller.js';
import {
  crearDistribuidorSchema,
  actualizarDistribuidorSchema,
} from './distribuidor.schema.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';

export const distribuidorRouter = Router();
const distribuidorController = new DistribuidorController();

distribuidorRouter.get('/', distribuidorController.getAllDistribuidor);

distribuidorRouter.get('/:dni', distribuidorController.getOneDistribuidorByDni);

distribuidorRouter.post(
  '/',
  validarConSchema({ body: crearDistribuidorSchema }),
  distribuidorController.createDistribuidor
);

distribuidorRouter.patch(
  '/:dni',
  validarConSchema({ body: actualizarDistribuidorSchema }),
  distribuidorController.patchUpdateDistribuidor
);

distribuidorRouter.delete('/:dni', distribuidorController.deleteDistribuidor);
