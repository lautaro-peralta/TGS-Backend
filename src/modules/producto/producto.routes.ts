// src/modules/producto/producto.routes.ts
import { Router } from 'express';
import { ProductoController } from './producto.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import {
  crearProductoSchema,
  actualizarProductoSchema,
  // buscarProductoSchema, // <- descomenta si lo agregaste en producto.schema.ts
} from './producto.schema.js';
import { Rol } from '../auth/usuario.entity.js';

export const productoRouter = Router();
const productoController = new ProductoController();

// GET /productos  (Opción A: soporta ?q= para búsqueda parcial por descripción)
// Si ya definiste buscarProductoSchema en producto.schema.ts, validá el query así:
// productoRouter.get('/', validarConSchema({ query: buscarProductoSchema }), productoController.getAllProductos);
productoRouter.get('/', productoController.getAllProductos);

productoRouter.get('/:id', productoController.getOneProductoById);

// POST /productos  (ADMIN o DISTRIBUIDOR)
productoRouter.post(
  '/',
  validarConSchema({ body: crearProductoSchema }),
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN], Rol.DISTRIBUIDOR),
  productoController.createProducto
);

productoRouter.patch(
  '/:id',
  validarConSchema({ body: actualizarProductoSchema }),
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN, Rol.DISTRIBUIDOR]),
  productoController.updateProducto
);

// DELETE /productos/:id  (ADMIN o DISTRIBUIDOR)
productoRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN], Rol.DISTRIBUIDOR),
  productoController.deleteProducto
);
