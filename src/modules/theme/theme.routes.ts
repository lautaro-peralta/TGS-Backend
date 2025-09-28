import { Router } from 'express';
import { TematicaController } from './tematica.controller.js';
import {
  actualizarTematicaSchema,
  crearTematicaSchema,
} from './tematica.schema.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';

export const tematicaRouter = Router();
const tematicaController = new TematicaController();

tematicaRouter.get('/', tematicaController.getAllTematicas);

tematicaRouter.get('/:id', tematicaController.getOneTematicaById);

tematicaRouter.post(
  '/',
  validarConSchema({ body: crearTematicaSchema }),
  tematicaController.createTematica
);

tematicaRouter.patch(
  '/:id',
  validarConSchema({ body: actualizarTematicaSchema }),
  tematicaController.updateTematica
);

tematicaRouter.delete('/:id', tematicaController.deleteTematica);
