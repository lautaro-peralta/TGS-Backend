import { Router } from 'express';
import { findAll, findOne, add, remove } from './venta.controller.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import { crearVentaSchema } from './venta.schema.js';
import { authMiddleware, adminMiddleware } from '../auth/auth.middleware.js';
//agregar la autenticación del distribuidor para ver las ventas suyas 
//en distribMiddleware, se debe poder acceder tambien si es el admin
export const ventaRouter = Router();
ventaRouter.get('/', authMiddleware, adminMiddleware, findAll);
//ventaRouter.get('/',authMiddleware, distribMiddleware,  findAllMine);
ventaRouter.get('/:id', authMiddleware, adminMiddleware, findOne);
//ventaRouter.get('/:id', authMiddleware, distribMiddleware, findOneMine);
ventaRouter.post('/', authMiddleware, adminMiddleware, /* --> distribMiddleware,*/ validarConSchema({ body: crearVentaSchema }), add);
ventaRouter.delete('/:id', authMiddleware, adminMiddleware, remove);
//# sourceMappingURL=venta.routes.js.map