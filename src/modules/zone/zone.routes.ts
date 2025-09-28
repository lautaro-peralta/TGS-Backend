import { ZoneController } from './zone.controller.js';
import { rolesMiddleware, authMiddleware } from '../auth/auth.middleware.js';
import { updateZoneSchema, createZoneSchema } from './zone.schema.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import { Router } from 'express';
import { Role } from '../auth/user.entity.js';

export const zoneRouter = Router();
const zoneController = new ZoneController();

zoneRouter.get('/', zoneController.getAllZones);

zoneRouter.get('/:id', zoneController.getOneZoneById);

zoneRouter.post(
  '/',
  validateWithSchema({ body: createZoneSchema }),
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  zoneController.createZone
);

zoneRouter.patch(
  '/:id',
  validateWithSchema({ body: updateZoneSchema }),
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  zoneController.updateZone
);

zoneRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  zoneController.deleteZone
);
