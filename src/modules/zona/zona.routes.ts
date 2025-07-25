import { Router } from 'express';
import {
  findAll,
  findOne,
  add,
  update,
  remove,
<<<<<<< Updated upstream
} from './zona.controller'; // corregí el typo "controler"
=======
} from './zona.controller.js';
import { adminMiddleware} from '../auth/auth.middleware.js'
import { actualizarZonaSchema, crearZonaSchema } from './zona.schema.js';
import { validarConSchema } from 'shared/validation/zod.middleware.js';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

export const zonaRouter = Router();

zonaRouter.get('/', findAll);
zonaRouter.get('/:id', findOne);
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
zonaRouter.post('/', sanitizarInputZona, add);
zonaRouter.put('/:id', sanitizarInputZona, update);
zonaRouter.patch('/:id', sanitizarInputZona, update);
=======
zonaRouter.post('/',validarConSchema({ body: crearZonaSchema }), add);
zonaRouter.put('/:id',validarConSchema({ body: actualizarZonaSchema }), update);
zonaRouter.patch('/:id', validarConSchema({ body: actualizarZonaSchema }), update);
>>>>>>> Stashed changes
=======
zonaRouter.post('/',validarConSchema({ body: crearZonaSchema }), add);
zonaRouter.put('/:id',validarConSchema({ body: actualizarZonaSchema }), update);
zonaRouter.patch('/:id', validarConSchema({ body: actualizarZonaSchema }), update);
>>>>>>> Stashed changes
=======
zonaRouter.post('/',validarConSchema({ body: crearZonaSchema }), add);
zonaRouter.put('/:id',validarConSchema({ body: actualizarZonaSchema }), update);
zonaRouter.patch('/:id', validarConSchema({ body: actualizarZonaSchema }), update);
>>>>>>> Stashed changes
zonaRouter.delete('/:id', remove);
