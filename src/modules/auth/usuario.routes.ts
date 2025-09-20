import { Router } from 'express';
import { UsuarioController } from './usuario.controller.js';
import { authMiddleware, rolesMiddleware } from './auth.middleware.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import { cambiarRolSchema } from './usuario.schema.js';
import { Rol, Usuario } from '../auth/usuario.entity.js';

export const usuarioRouter = Router();
const usuarioController = new UsuarioController();

// Obtener perfil del usuario autenticado
usuarioRouter.get(
  '/me', //authMiddleware,
  usuarioController.getPerfilUsuario
);

// Cambiar rol de un usuario (solo ADMIN)
usuarioRouter.patch(
  '/:id/rol',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  validarConSchema(cambiarRolSchema),
  usuarioController.updateRolesUsuario
);

// Obtener todos los usuarios (opcionalmente protegido solo para ADMIN)
usuarioRouter.get(
  '/',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  usuarioController.getAllUsuarios
);

//Obtener user por id o username (solo ADMIN)
usuarioRouter.get(
  '/:identificador',
  //authMiddleware,
  //rolesMiddleware([Rol.ADMIN]),
  usuarioController.getOneUsuarioById
);
