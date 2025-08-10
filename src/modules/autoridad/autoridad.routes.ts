import { authMiddleware, rolesMiddleware} from "../../modules/auth/auth.middleware.js";
import { Router } from 'express';
import * as autoridadController from './autoridad.controller.js';
import { validarConSchema } from "../../shared/validation/zod.middleware.js";
import { crearAutoridadSchema, actualizarAutoridadSchema, parcialActualizarAutoridadSchema, pagarSobornosSchema } from "./autoridad.schema.js";
import { z } from 'zod';
import { Rol } from "../auth/usuario.entity.js";

const autoridadRouter = Router();

const dniParamSchema = z.object({
  dni: z.string().min(7).max(10),
});

autoridadRouter.post('/', authMiddleware, rolesMiddleware([Rol.ADMIN]), validarConSchema({ body: crearAutoridadSchema }), autoridadController.crear);

autoridadRouter.get('/', authMiddleware, rolesMiddleware([Rol.ADMIN]), autoridadController.listar);
autoridadRouter.get('/:dni', authMiddleware, rolesMiddleware([Rol.ADMIN]), validarConSchema({ params: dniParamSchema }), autoridadController.obtenerPorDni);
autoridadRouter.get('/sobornos', authMiddleware, rolesMiddleware([Rol.ADMIN, Rol.AUTORIDAD]), autoridadController.verSobornosAutoridad)

autoridadRouter.put('/:dni', authMiddleware, rolesMiddleware([Rol.ADMIN, Rol.AUTORIDAD]), validarConSchema({ body: actualizarAutoridadSchema }), autoridadController.putUpdate );

autoridadRouter.patch('/:dni', authMiddleware, rolesMiddleware([Rol.ADMIN, Rol.AUTORIDAD]), validarConSchema({ body: parcialActualizarAutoridadSchema }), autoridadController.patchUpdate);

autoridadRouter.delete('/:dni', authMiddleware,  rolesMiddleware([Rol.ADMIN, Rol.AUTORIDAD]), autoridadController.eliminar);

export {autoridadRouter};