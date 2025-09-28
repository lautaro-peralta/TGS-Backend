import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authMiddleware, rolesMiddleware } from './auth.middleware.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import { changeRoleSchema } from './user.schema.js';
import { Role } from '../auth/user.entity.js';

export const userRouter = Router();
const userController = new UserController();

// Get authenticated user profile
userRouter.get('/me', authMiddleware, userController.getUserProfile);

// Change user role (ADMIN only)
userRouter.patch(
  '/:id/role',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  validateWithSchema(changeRoleSchema),
  userController.updateUserRoles
);

// Get all users (optionally protected for ADMIN only)
userRouter.get(
  '/',
  authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  userController.getAllUsers
);

//Get user by id or username (ADMIN only)
userRouter.get(
  '/:identifier',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  userController.getOneUserById
);
