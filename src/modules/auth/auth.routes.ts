import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';
import { loginSchema, registroSchema } from './auth.schema.js';

const authRouter = Router();
const authController = new AuthController();

authRouter.post(
  '/register',
  validarConSchema({ body: registroSchema }),
  authController.signup
);
authRouter.post(
  '/login',
  validarConSchema({ body: loginSchema }),
  authController.login
);

export { authRouter };
