import { Router } from 'express';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import { pagarSobornosSchema } from './soborno.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { SobornoController } from '../soborno/soborno.controller.js';
import { Rol } from '../auth/usuario.entity.js';

export const sobornoRouter = Router();
const sobornoController = new SobornoController();

sobornoRouter.get(
  '/',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  sobornoController.getAllSobornos
);

sobornoRouter.get(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  sobornoController.getOneSobornoById
);

sobornoRouter.patch(
  '/pagar',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  validarConSchema({ body: pagarSobornosSchema }),
  sobornoController.pagarSobornos
);

sobornoRouter.patch(
  '/:id/pagar',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  validarConSchema({ body: pagarSobornosSchema }),
  sobornoController.pagarSobornos
);

sobornoRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  sobornoController.deleteSoborno
);
