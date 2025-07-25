import { Router } from 'express';
import { findAll, findOne, add, putUpdate, patchUpdate, remove } from './cliente.controller.js';
import { actualizarClienteSchema, crearClienteSchema } from './cliente.schema.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
export const clienteRouter = Router();
clienteRouter.get('/', findAll);
clienteRouter.get('/:dni', findOne);
clienteRouter.post('/', validarConSchema({ body: crearClienteSchema }), add);
clienteRouter.put('/:dni', validarConSchema({ body: crearClienteSchema }), putUpdate);
clienteRouter.patch('/:dni', validarConSchema({ body: actualizarClienteSchema }), patchUpdate);
clienteRouter.delete('/:dni', remove);
//# sourceMappingURL=cliente.routes.js.map