import {
  authMiddleware,
  rolesMiddleware,
} from '../../modules/auth/auth.middleware.js';
import { Router } from 'express';
import { AutoridadController } from './autoridad.controller.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import {
  crearAutoridadSchema,
  actualizarAutoridadSchema,
  parcialActualizarAutoridadSchema,
  pagarSobornosSchema,
} from './autoridad.schema.js';
import { z } from 'zod';
import { Rol } from '../auth/usuario.entity.js';

export const autoridadRouter = Router();
const autoridadController = new AutoridadController();

const dniParamSchema = z.object({
  dni: z.string().min(7).max(10),
});

autoridadRouter.post(
  '/',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  validarConSchema({ body: crearAutoridadSchema }),
  autoridadController.createAutoridad
);

autoridadRouter.get(
  '/',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  autoridadController.getAllAutoridades
);

autoridadRouter.get(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  validarConSchema({ params: dniParamSchema }),
  autoridadController.getOneAutoridadByDni
);

autoridadRouter.get(
  '/:dni/sobornos',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN, Rol.AUTORIDAD]),
  autoridadController.getSobornosAutoridad
);

autoridadRouter.put(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN, Rol.AUTORIDAD]),
  validarConSchema({ body: actualizarAutoridadSchema }),
  autoridadController.putUpdateAutoridad
);

autoridadRouter.patch(
  '/:dni',
  //uthMiddleware,
  //rolesMiddleware([Rol.ADMIN, Rol.AUTORIDAD]),
  validarConSchema({ body: parcialActualizarAutoridadSchema }),
  autoridadController.patchUpdateAutoridad
);

autoridadRouter.delete(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN, Rol.AUTORIDAD]),
  autoridadController.deleteAutoridad
);
