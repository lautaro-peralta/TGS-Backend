import { Router } from 'express';
import { VentaController } from './venta.controller.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import { crearVentaSchema } from './venta.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { Rol } from '../auth/usuario.entity.js';
//agregar la autenticación del distribuidor para ver las ventas suyas
//en distribMiddleware, se debe poder acceder tambien si es el admin

export const ventaRouter = Router();
const ventaController = new VentaController();

ventaRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Rol.ADMIN]),
  ventaController.getAllVentas
);

// ventaRouter.get('/',
//   authMiddleware, distribMiddleware,
//   getAllVentasMine
// );

ventaRouter.get(
  '/:id',
  authMiddleware,
  rolesMiddleware([Rol.ADMIN]),
  ventaController.getOneVentaById
);

// ventaRouter.get('/:id',
//   authMiddleware, distribMiddleware,
//   getOneVentaMine
// );

ventaRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Rol.ADMIN]) /* --> distribMiddleware, */,
  validarConSchema({ body: crearVentaSchema }),
  ventaController.createVenta
);

ventaRouter.delete(
  '/:id',
  authMiddleware,
  rolesMiddleware([Rol.ADMIN]),
  ventaController.deleteVenta
);
