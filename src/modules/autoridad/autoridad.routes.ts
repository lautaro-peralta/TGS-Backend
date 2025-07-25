import { adminMiddleware, authMiddleware } from "../../modules/auth/auth.middleware.js";
import { Router } from 'express';
import * as autoridadController from './autoridad.controller.js';
import { validarConSchema } from "../../shared/validation/zod.middleware.js";
import { crearAutoridadSchema, actualizarAutoridadSchema, parcialActualizarAutoridadSchema } from "./autoridad.schema.js";
import { z } from 'zod';

const autoridadRouter = Router();

const dniParamSchema = z.object({
  dni: z.string().min(7).max(10),
});

autoridadRouter.post('/', authMiddleware, adminMiddleware, validarConSchema({ body: crearAutoridadSchema }), autoridadController.crear);
autoridadRouter.get('/', authMiddleware, adminMiddleware, autoridadController.listar);
autoridadRouter.get('/:dni', authMiddleware, adminMiddleware, validarConSchema({ params: dniParamSchema }), autoridadController.obtenerPorDni);
autoridadRouter.put('/:dni', authMiddleware, adminMiddleware, validarConSchema({ body: actualizarAutoridadSchema }), autoridadController.putUpdate );
autoridadRouter.patch('/:dni', authMiddleware, adminMiddleware, validarConSchema({ body: parcialActualizarAutoridadSchema }), autoridadController.patchUpdate);
autoridadRouter.delete('/:dni', authMiddleware, adminMiddleware, autoridadController.eliminar);

export {autoridadRouter};