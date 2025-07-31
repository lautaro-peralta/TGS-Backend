import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './distribuidora.controller.js';
import { crearDistribuidoraSchema, actualizarDistribuidoraSchema } from './distribuidora.schema.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';

export const distribuidoraRouter = Router();

distribuidoraRouter.get('/', findAll);
distribuidoraRouter.get('/:idDistrib', findOne);
distribuidoraRouter.post('/', validarConSchema({ body: crearDistribuidoraSchema }), add);
distribuidoraRouter.put('/:idDistrib', validarConSchema({ body: crearDistribuidoraSchema }), update);
distribuidoraRouter.patch('/:idDistrib', validarConSchema({ body: actualizarDistribuidoraSchema }), update);
distribuidoraRouter.delete('/:idDistrib', remove);
