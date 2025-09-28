import { Router } from 'express';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import { payBribesSchema } from './bribe.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { BribeController } from './bribe.controller.js';
import { Role } from '../auth/user.entity.js';

export const bribeRouter = Router();
const bribeController = new BribeController();

bribeRouter.get(
  '/',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  bribeController.getAllBribes
);

bribeRouter.get(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  bribeController.getOneBribeById
);

bribeRouter.patch(
  '/pay',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: payBribesSchema }),
  bribeController.payBribes
);

bribeRouter.patch(
  '/:id/pay',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: payBribesSchema }),
  bribeController.payBribes
);
/*
bribeRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  bribeController.deleteBribe
);*/
