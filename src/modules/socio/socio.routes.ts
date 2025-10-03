import { Router } from 'express';
import { SocioController } from './socio.controller.js';

const partnerController = new SocioController(); 
export const socioRouter = Router();

socioRouter.get('/', partnerController.getAllSocios.bind(partnerController));
socioRouter.get('/:dni', partnerController.getOneSocioByDni.bind(partnerController));

socioRouter.post('/', partnerController.createSocio.bind(partnerController));
socioRouter.patch('/:dni', partnerController.patchUpdateSocio.bind(partnerController));
socioRouter.delete('/:dni', partnerController.deleteSocio.bind(partnerController));

/** Relaciones con Decisiones */
socioRouter.post('/:dni/decisiones', partnerController.linkDecision.bind(partnerController));
socioRouter.delete('/:dni/decisiones/:linkId', partnerController.unlinkDecision.bind(partnerController));
socioRouter.get('/:dni/decisiones', partnerController.listDecisiones.bind(partnerController));

/** Relaciones con Ventas */
socioRouter.post('/:dni/ventas', partnerController.createVentaForSocio.bind(partnerController));
socioRouter.get('/:dni/ventas', partnerController.listVentasBySocio.bind(partnerController));
