import { adminMiddleware } from "modules/auth/auth.middleware.js";
import { Router } from 'express';
import * as autoridadController from './autoridad.controller.js';
import { validarConSchema } from "../../shared/validation/zod.middleware.js";
import { crearAutoridadSchema } from "./autoridad.schema.js";
const router = Router();
router.post('/', adminMiddleware, validarConSchema({ body: crearAutoridadSchema }), autoridadController.crear);
router.get('/', adminMiddleware, autoridadController.listar);
router.delete('/:dni', adminMiddleware, autoridadController.eliminar);
export default router;
//# sourceMappingURL=autoridad.routes.js.map