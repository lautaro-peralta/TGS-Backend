import { Router } from 'express';
import { ClientController } from './client.controller.js';
import {
  updateClientSchema,
  createClientSchema,
} from './client.schema.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';

export const clientRouter = Router();
const clientController = new ClientController();

clientRouter.get('/', clientController.getAllClients);

clientRouter.get('/:dni', clientController.getOneClientByDni);

clientRouter.post(
  '/',
  validateWithSchema({ body: createClientSchema }),
  clientController.createClient
);

clientRouter.patch(
  '/:dni',
  validateWithSchema({ body: updateClientSchema }),
  clientController.patchUpdateClient
);

clientRouter.delete('/:dni', clientController.deleteClient);
