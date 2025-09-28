import { Router } from 'express';
import { DistributorController } from './distributor.controller.js';
import {
  createDistributorSchema,
  updateDistributorSchema,
} from './distributor.schema.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';

export const distributorRouter = Router();
const distributorController = new DistributorController();

distributorRouter.get('/', distributorController.getAllDistributors);

distributorRouter.get('/:dni', distributorController.getOneDistributorByDni);

distributorRouter.post(
  '/',
  validateWithSchema({ body: createDistributorSchema }),
  distributorController.createDistributor
);

distributorRouter.patch(
  '/:dni',
  validateWithSchema({ body: updateDistributorSchema }),
  distributorController.patchUpdateDistributor
);

distributorRouter.delete('/:dni', distributorController.deleteDistributor);
