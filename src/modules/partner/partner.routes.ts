import { Router } from 'express';
import { PartnerController } from './partner.controller.js';
import { createPartnerSchema, updatePartnerSchema } from './partner.schema.js';
import { validarConSchema } from '../../shared/utils/zod.middleware.js';

export const partnerRouter = Router();

/**
 * Keep a single controller instance as in main conventions.
 * Bind methods explicitly to preserve this.
 */
const partnerController = new PartnerController();

/**
 * === Core CRUD ===
 * IMPORTANT: Do NOT accept query params in getAll.
 * Searching MUST go through /search (separate endpoint).
 */
partnerRouter.get(
  '/',
  partnerController.getAllPartners.bind(partnerController)
);

partnerRouter.get(
  '/search',
  partnerController.searchPartners.bind(partnerController)
);

partnerRouter.get(
  '/:dni',
  partnerController.getPartnerByDni.bind(partnerController)
);

partnerRouter.post(
  '/',
  // Validate request body with Zod (create schema)
  validarConSchema({ body: createPartnerSchema }),
  partnerController.createPartner.bind(partnerController)
);

partnerRouter.patch(
  '/:dni',
  // Validate request body with Zod (update schema: all fields optional)
  validarConSchema({ body: updatePartnerSchema }),
  partnerController.updatePartner.bind(partnerController)
);

partnerRouter.delete(
  '/:dni',
  partnerController.deletePartner.bind(partnerController)
);

/**
 * === Relations (aligned with main) ===
 * - No creation of sales from the partner module.
 * - If/when enabled, use these read/link/unlink endpoints only.
 */
// partnerRouter.get('/:dni/decisions', partnerController.listDecisions.bind(partnerController));
// partnerRouter.post('/:dni/decisions', partnerController.linkDecision.bind(partnerController));
// partnerRouter.delete('/:dni/decisions/:linkId', partnerController.unlinkDecision.bind(partnerController));
// partnerRouter.get('/:dni/sales', partnerController.listSalesByPartner.bind(partnerController));