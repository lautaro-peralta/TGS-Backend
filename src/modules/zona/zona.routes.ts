import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../auth/auth.middleware.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import {findAll,findOne,add,patchUpdate,putUpdate,remove} from './zona.controller.js';
import { crearZonaSchema, actualizarZonaSchema } from './zona.schema.js';

export const zonaRouter = Router();

// Lectura abierta a cualquier usuario
zonaRouter.get('/', findAll);
zonaRouter.get('/:id', findOne);

// Solo administradores pueden crear, modificar o eliminar zonas
zonaRouter.post('/',authMiddleware,adminMiddleware,validarConSchema({ body: crearZonaSchema }),add);

zonaRouter.put('/:id',authMiddleware,adminMiddleware,validarConSchema({ body: actualizarZonaSchema }),putUpdate);

zonaRouter.patch('/:id',authMiddleware,adminMiddleware,validarConSchema({ body: actualizarZonaSchema }),patchUpdate);

zonaRouter.delete('/:id',authMiddleware,adminMiddleware,remove);
