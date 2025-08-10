import { Router } from 'express';
import { findAll, findOne, add, update, remove } from './producto.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import { crearProductoSchema, actualizarProductoSchema } from './producto.schema.js';
import { Rol } from '../auth/usuario.entity.js';

export const productoRouter = Router();

//Falta implementar todo lo que sea rolesMiddleware con rol Distribuidor

productoRouter.get('/', findAll);
productoRouter.get('/:id', findOne);
productoRouter.post('/',validarConSchema({body: crearProductoSchema}),authMiddleware, rolesMiddleware([Rol.ADMIN]), add);
productoRouter.put('/:id', validarConSchema({body: actualizarProductoSchema}),authMiddleware, rolesMiddleware([Rol.ADMIN]), update);
productoRouter.patch('/:id',validarConSchema({body: actualizarProductoSchema}),authMiddleware, rolesMiddleware([Rol.ADMIN]), update);
productoRouter.delete('/:id', authMiddleware, rolesMiddleware([Rol.ADMIN]), remove);
