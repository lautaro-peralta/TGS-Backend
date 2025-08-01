import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './producto.controller.js';
import { authMiddleware, adminMiddleware } from '../auth/auth.middleware.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import { crearProductoSchema, actualizarProductoSchema } from './producto.schema.js';


export const productoRouter = Router();

// Rutas protegidas y con schemas
productoRouter.get('/', findAll);
productoRouter.get('/:id', findOne);
productoRouter.post('/',validarConSchema({body: crearProductoSchema}),authMiddleware, adminMiddleware, add);
productoRouter.put('/:id', validarConSchema({body: actualizarProductoSchema}),authMiddleware, adminMiddleware, update);
productoRouter.patch('/:id',validarConSchema({body: actualizarProductoSchema}),authMiddleware, adminMiddleware, update);
productoRouter.delete('/:id', authMiddleware, adminMiddleware, remove);
