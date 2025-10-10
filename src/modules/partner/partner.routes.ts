// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { PartnerController } from './partner.controller.js';
import {
  updatePartnerSchema,
  createPartnerSchema,
} from './partner.schema.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';

// ============================================================================
// ROUTER - Partner
// ============================================================================
export const partnerRouter = Router();
const partnerController = new PartnerController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/partners/search
 * @desc    Search partners by name, email or dni.
 * @access  Public
 */
partnerRouter.get('/search', partnerController.searchPartners);

/**
 * @route   GET /api/partners
 * @desc    Get all partners.
 * @access  Public
 */
partnerRouter.get('/', partnerController.getAllPartners);

/**
 * @route   GET /api/partners/:dni
 * @desc    Get a single partner by DNI.
 * @access  Public
 */
partnerRouter.get('/:dni', partnerController.getPartnerByDni);

/**
 * @route   POST /api/partners
 * @desc    Create a new partner.
 * @access  Public
 */
partnerRouter.post(
  '/',
  validateWithSchema({ body: createPartnerSchema }),
  partnerController.createPartner
);

/**
 * @route   PATCH /api/partners/:dni
 * @desc    Partially update a partner by DNI.
 * @access  Public
 */
partnerRouter.patch(
  '/:dni',
  validateWithSchema({ body: updatePartnerSchema }),
  partnerController.updatePartner
);

/**
 * @route   DELETE /api/partners/:dni
 * @desc    Delete a partner by DNI.
 * @access  Public
 */
partnerRouter.delete('/:dni', partnerController.deletePartner);