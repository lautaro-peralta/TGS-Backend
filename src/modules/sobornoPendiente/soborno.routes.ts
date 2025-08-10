import { Router } from 'express';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import { actualizarSobornoSchema } from './soborno.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { findAll, findOne, pagarSoborno, remove } from '../sobornoPendiente/soborno.controller.js';
import { Rol } from '../auth/usuario.entity.js';

export const sobornoRouter = Router();

sobornoRouter.get('/', authMiddleware,  rolesMiddleware([Rol.ADMIN]), findAll);
sobornoRouter.get('/:id', authMiddleware, rolesMiddleware([Rol.ADMIN]), findOne);
sobornoRouter.patch('/:id/pagar', authMiddleware, rolesMiddleware([Rol.ADMIN]), validarConSchema({ body: actualizarSobornoSchema }), pagarSoborno);
sobornoRouter.delete('/:id', authMiddleware, rolesMiddleware([Rol.ADMIN]), remove);