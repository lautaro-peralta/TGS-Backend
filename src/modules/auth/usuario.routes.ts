import { Router } from 'express';
import { UsuarioController } from './usuario.controller.js';
import { authMiddleware, adminMiddleware } from './auth.middleware.js';

const usuarioRouter = Router();

// Obtener perfil del usuario autenticado
usuarioRouter.get('/me', authMiddleware, UsuarioController.obtenerPerfil);

// Cambiar rol de un usuario (solo ADMIN)
usuarioRouter.patch('/:id/rol', authMiddleware, adminMiddleware, UsuarioController.updateRol);

// Obtener todos los usuarios (opcionalmente protegido solo para ADMIN)
usuarioRouter.get('/', authMiddleware, adminMiddleware, UsuarioController.findAll);

// Obtener usuario por ID (solo ADMIN)
usuarioRouter.get('/:id', authMiddleware, adminMiddleware, UsuarioController.findOne);

export default usuarioRouter;