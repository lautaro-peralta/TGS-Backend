import { Router } from 'express';
import {
  sanitizarInputZona,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './zona.controller'; // corregí el typo "controler"
import { adminMiddleware } from 'modules/auth/auth.middleware.js';

export const zonaRouter = Router();

zonaRouter.get('/', findAll);
zonaRouter.get('/:id', findOne);
zonaRouter.post('/',adminMiddleware, sanitizarInputZona, add);
zonaRouter.put('/:id',adminMiddleware, sanitizarInputZona, update);
zonaRouter.patch('/:id', adminMiddleware, sanitizarInputZona, update);
zonaRouter.delete('/:id',adminMiddleware, remove);