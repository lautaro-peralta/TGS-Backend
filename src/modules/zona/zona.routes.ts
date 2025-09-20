import { ZonaController } from './zona.controller.js';
import { rolesMiddleware, authMiddleware } from '../auth/auth.middleware.js';
import { actualizarZonaSchema, crearZonaSchema } from './zona.schema.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import { Router } from 'express';

export const zonaRouter = Router();
const zonaController = new ZonaController();

zonaRouter.get('/', zonaController.getAllZonas);

zonaRouter.get('/:id', zonaController.getOneZonaById);

zonaRouter.post(
  '/',
  validarConSchema({ body: crearZonaSchema }),
  //authMiddleware,
  //rolesMiddleware,
  zonaController.createZona
);

zonaRouter.patch(
  '/:id',
  validarConSchema({ body: actualizarZonaSchema }),
  //authMiddleware,
  //rolesMiddleware,
  zonaController.updateZona
);

zonaRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware,
  zonaController.deleteZona
);
