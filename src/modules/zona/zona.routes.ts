import {findAll,findOne,add,update,remove} from './zona.controller.js'; 
import { adminMiddleware} from '../auth/auth.middleware'
import { actualizarZonaSchema, crearZonaSchema } from './zona.schema.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import { Router } from 'express';



export const zonaRouter = Router();
zonaRouter.get('/', findAll);
zonaRouter.get('/:id', findOne);
zonaRouter.post('/',validarConSchema({ body: crearZonaSchema }), add);
zonaRouter.put('/:id',validarConSchema({ body: actualizarZonaSchema }), update);
zonaRouter.patch('/:id', validarConSchema({ body: actualizarZonaSchema }), update);
zonaRouter.delete('/:id', remove);
