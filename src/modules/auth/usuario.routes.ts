import { Router } from 'express';
import { UsuarioController } from './usuario.controller.js';
import { authMiddleware, rolesMiddleware } from './auth.middleware.js';
import { validarConSchema } from "../../shared/validation/zod.middleware.js";
import { cambiarRolSchema } from './usuario.schema.js';
import { Rol } from '../auth/usuario.entity.js';

const usuarioRouter = Router();

// Obtener perfil del usuario autenticado
usuarioRouter.get('/me', authMiddleware, UsuarioController.obtenerPerfil);

// Cambiar rol de un usuario (solo ADMIN)
usuarioRouter.patch(
  "/:id/rol",
  authMiddleware,
  rolesMiddleware([Rol.ADMIN]),
  validarConSchema(cambiarRolSchema),
  UsuarioController.updateRoles
);

// Obtener todos los usuarios (opcionalmente protegido solo para ADMIN)
usuarioRouter.get('/', authMiddleware, rolesMiddleware([Rol.ADMIN]), UsuarioController.findAll);

//Obtener user por id o username (solo ADMIN)
usuarioRouter.get(
  "/:identificador",
  authMiddleware,
  rolesMiddleware([Rol.ADMIN]),
  UsuarioController.findOneByIdentificador
);

export {usuarioRouter};