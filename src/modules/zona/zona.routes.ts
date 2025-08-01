import {findAll,findOne,add,update,remove} from './zona.controller.js'; 
import { adminMiddleware, authMiddleware} from '../auth/auth.middleware.js'
import { actualizarZonaSchema, crearZonaSchema } from './zona.schema.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import { Router } from 'express';



export const zonaRouter = Router();
zonaRouter.get('/', findAll);
zonaRouter.get('/:id', findOne);
zonaRouter.post('/',validarConSchema({ body: crearZonaSchema }), authMiddleware,adminMiddleware, add);
zonaRouter.patch('/:id', validarConSchema({ body: actualizarZonaSchema }), authMiddleware,adminMiddleware,update);
zonaRouter.delete('/:id', authMiddleware,adminMiddleware, remove);
