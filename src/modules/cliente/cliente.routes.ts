import { Router } from 'express';
import { ClienteController } from './cliente.controller.js';
import { actualizarClienteSchema, crearClienteSchema } from './cliente.schema.js'
import { validarConSchema } from '../../shared/validation/zod.middleware.js';

export const clienteRouter = Router()
const clienteController = new ClienteController();


clienteRouter.get('/',
  clienteController.getAllClientes
)

clienteRouter.get('/:dni',
  clienteController.getOneClienteByDni
)

clienteRouter.post('/',validarConSchema({ body: crearClienteSchema }),
  clienteController.createCliente
)

clienteRouter.patch('/:dni', validarConSchema({ body: actualizarClienteSchema }),
  clienteController.patchUpdateCliente
)

clienteRouter.delete('/:dni',
  clienteController.deleteCliente
)