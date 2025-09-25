import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import { loginSchema, registerSchema } from './auth.schema.js';

const authRouter = Router();
const authController = new AuthController();

authRouter.post(
  '/register',
  validarConSchema({ body: registerSchema }),
  authController.register
);
authRouter.post(
  '/login',
  validarConSchema({ body: loginSchema }),
  authController.login
);
authRouter.post('/logout', authController.logout);
export { authRouter };
