import { Router } from 'express';
import { AuthController } from './auth.controller.js';
const authRouter = Router();
authRouter.post('/register', AuthController.signup);
authRouter.post('/login', AuthController.login);
export default authRouter;
//# sourceMappingURL=auth.routes.js.map