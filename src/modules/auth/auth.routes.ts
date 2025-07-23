import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validarConSchema } from '../../shared/validation/zod.middleware.js';
import { loginSchema, registroSchema } from './auth.schema.js';

const authRouter = Router();

authRouter.post('/register',validarConSchema({ body: registroSchema }), AuthController.signup);
authRouter.post('/login', validarConSchema({ body: loginSchema }), AuthController.login);

export default authRouter;
