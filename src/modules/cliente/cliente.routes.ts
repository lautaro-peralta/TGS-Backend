import {Router} from 'express';
import { findAll,findOne,crear, patchUpdate, remove } from './cliente.controller.js';
import { actualizarClienteSchema, crearClienteSchema} from './cliente.schema.js'
import { validarConSchema } from '../../shared/validation/zod.middleware.js';

export const clienteRouter = Router()

clienteRouter.get('/',findAll)
clienteRouter.get('/:dni',findOne)
clienteRouter.post('/',validarConSchema({ body: crearClienteSchema }), crear)
clienteRouter.patch('/:dni', validarConSchema({ body: actualizarClienteSchema }),patchUpdate)
clienteRouter.delete('/:dni',remove)