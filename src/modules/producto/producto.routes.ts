import { Router } from 'express';
import { ProductoController } from './producto.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import {
  crearProductoSchema,
  actualizarProductoSchema,
} from './producto.schema.js';
import { Rol } from '../auth/usuario.entity.js';

export const productoRouter = Router();
const productoController = new ProductoController();
//Falta implementar todo lo que sea rolesMiddleware con rol Distribuidor

productoRouter.get('/', productoController.getAllProductos);

productoRouter.get('/:id', productoController.getOneProductoById);

productoRouter.post(
  '/',
  validarConSchema({ body: crearProductoSchema }),
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  productoController.createProducto
);

productoRouter.patch(
  '/:id',
  validarConSchema({ body: actualizarProductoSchema }),
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  productoController.updateProducto
);

productoRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  productoController.deleteProducto
);
