import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import { loginSchema, registerSchema } from './auth.schema.js';

const authRouter = Router();
const authController = new AuthController();

authRouter.post(
  '/register',
  validateWithSchema({ body: registerSchema }),
  authController.register
);
authRouter.post(
  '/login',
  validateWithSchema({ body: loginSchema }),
  authController.login
);
authRouter.post('/logout', authController.logout);
export { authRouter };
