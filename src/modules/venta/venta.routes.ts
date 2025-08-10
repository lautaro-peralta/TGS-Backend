import { Router } from 'express';
import { findAll, findOne, add, remove } from './venta.controller.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import { crearVentaSchema } from './venta.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { Rol } from '../auth/usuario.entity.js';
//agregar la autenticación del distribuidor para ver las ventas suyas 
//en distribMiddleware, se debe poder acceder tambien si es el admin

export const ventaRouter = Router();

ventaRouter.get('/', authMiddleware, rolesMiddleware([Rol.ADMIN]), findAll);
//ventaRouter.get('/',authMiddleware, distribMiddleware,  findAllMine);
ventaRouter.get('/:id', authMiddleware, rolesMiddleware([Rol.ADMIN]), findOne);
//ventaRouter.get('/:id', authMiddleware, distribMiddleware, findOneMine);
ventaRouter.post('/', authMiddleware, rolesMiddleware([Rol.ADMIN]), /* --> distribMiddleware,*/ validarConSchema({ body: crearVentaSchema }), add);
ventaRouter.delete('/:id', authMiddleware, rolesMiddleware([Rol.ADMIN]), remove);