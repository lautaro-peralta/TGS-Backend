import { Router } from 'express';
import {
  sanitizarInputProducto,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './producto.controller.js';
import { adminMiddleware } from 'modules/auth/auth.middleware.js';

export const productoRouter = Router();

// Rutas protegidas y con sanitización
productoRouter.get('/', findAll);
productoRouter.get('/:id', findOne);
productoRouter.post('/', adminMiddleware, sanitizarInputProducto, add);
productoRouter.put('/:id', adminMiddleware, sanitizarInputProducto, update);
productoRouter.patch('/:id', adminMiddleware, sanitizarInputProducto, update);
productoRouter.delete('/:id', adminMiddleware, remove);
