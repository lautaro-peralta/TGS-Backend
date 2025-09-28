import {
  authMiddleware,
  rolesMiddleware,
} from '../../modules/auth/auth.middleware.js';
import { Router } from 'express';
import { AuthorityController } from './authority.controller.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import {
  createAuthoritySchema,
  updateAuthoritySchema,
  partialUpdateAuthoritySchema,
  payBribesSchema,
} from './authority.schema.js';
import { z } from 'zod';
import { Role } from '../auth/user.entity.js';

export const authorityRouter = Router();
const authorityController = new AuthorityController();

const dniParamSchema = z.object({
  dni: z.string().min(7).max(10),
});

authorityRouter.post(
  '/',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: createAuthoritySchema }),
  authorityController.createAuthority
);

authorityRouter.get(
  '/',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  authorityController.getAllAuthorities
);

authorityRouter.get(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: dniParamSchema }),
  authorityController.getOneAuthorityByDni
);

authorityRouter.get(
  '/:dni/bribes',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN, Role.AUTHORITY]),
  authorityController.getAuthorityBribes
);

authorityRouter.put(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN, Role.AUTHORITY]),
  validateWithSchema({ body: updateAuthoritySchema }),
  authorityController.putUpdateAuthority
);

authorityRouter.patch(
  '/:dni',
  //uthMiddleware,
  //rolesMiddleware([Role.ADMIN, Role.AUTHORITY]),
  validateWithSchema({ body: partialUpdateAuthoritySchema }),
  authorityController.patchUpdateAuthority
);

authorityRouter.delete(
  '/:dni',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN, Role.AUTHORITY]),
  authorityController.deleteAuthority
);
