import { Router } from 'express';
import { SocioController } from './socio.controller.js';
import {
  actualizarSocioSchema,
  crearSocioSchema,
} from './socio.schema.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';

export const socioRouter = Router();
const socioController = new SocioController();

socioRouter.get('/', socioController.getAllSocios);

socioRouter.get('/:dni', socioController.getOneSocioByDni);

socioRouter.post(
  '/',
  validarConSchema({ body: crearSocioSchema }),
  socioController.createSocio
);

socioRouter.patch(
  '/:dni',
  validarConSchema({ body: actualizarSocioSchema }),
  socioController.patchUpdateSocio
);

socioRouter.delete('/:dni', socioController.deleteSocio);
