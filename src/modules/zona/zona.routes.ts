import {Router} from 'express';
import { sanitizarInputZona,findAll,findOne,add,update,remove } from './zona.controler';

export const zonaRouter = Router()

zonaRouter.get('/',findAll)
zonaRouter.get('/:id',findOne)
zonaRouter.post('/',sanitizarInputZona,add)
zonaRouter.put('/:id',sanitizarInputZona,update)
zonaRouter.patch('/:id',sanitizarInputZona,update)
zonaRouter.delete('/:id',remove)


