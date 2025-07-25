import {Router} from 'express';
import { sanitizarInputCliente,findAll,findOne,add,putUpdate, patchUpdate, remove } from './cliente.controller.js';

export const clienteRouter = Router()

clienteRouter.get('/',findAll)
clienteRouter.get('/:dni',findOne)
clienteRouter.post('/',sanitizarInputCliente,add)
clienteRouter.put('/:dni',sanitizarInputCliente,putUpdate)
clienteRouter.patch('/:dni',sanitizarInputCliente,patchUpdate)
clienteRouter.delete('/:dni',remove)
