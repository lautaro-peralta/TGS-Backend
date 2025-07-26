import { Router } from 'express';
import { UsuarioController } from './usuario.controller.js';
import { authMiddleware, adminMiddleware } from './auth.middleware.js';
import { validarConSchema } from "../../shared/validation/zod.middleware.js";
import { cambiarRolSchema } from './usuario.schema.js';
const usuarioRouter = Router();

// Obtener perfil del usuario autenticado
usuarioRouter.get('/me', authMiddleware, UsuarioController.obtenerPerfil);

// Cambiar rol de un usuario (solo ADMIN)
usuarioRouter.patch(
  "/:id/rol",
  authMiddleware,
  adminMiddleware,
  validarConSchema(cambiarRolSchema),
  UsuarioController.updateRol
);

// Obtener todos los usuarios (opcionalmente protegido solo para ADMIN)
usuarioRouter.get('/', authMiddleware, adminMiddleware, UsuarioController.findAll);

//Obtener user por id o username (solo ADMIN)
usuarioRouter.get(
  "/:identificador",
  authMiddleware,
  adminMiddleware,
  UsuarioController.findOneByIdentificador
);

export {usuarioRouter};