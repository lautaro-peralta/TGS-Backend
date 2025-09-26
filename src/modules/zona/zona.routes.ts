import { ZonaController } from './zona.controller.js';
import { rolesMiddleware, authMiddleware } from '../auth/auth.middleware.js';
import { actualizarZonaSchema, crearZonaSchema } from './zona.schema.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import { Router } from 'express';
import { Rol } from '../auth/usuario.entity.js';

export const zonaRouter = Router();
const zonaController = new ZonaController();

zonaRouter.get('/', zonaController.getAllZonas);

zonaRouter.get('/:id', zonaController.getOneZonaById);

zonaRouter.post(
  '/',
  validarConSchema({ body: crearZonaSchema }),
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  zonaController.createZona
);

zonaRouter.patch(
  '/:id',
  validarConSchema({ body: actualizarZonaSchema }),
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  zonaController.updateZona
);

zonaRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  zonaController.deleteZona
);
