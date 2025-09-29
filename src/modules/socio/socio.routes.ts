import { Router } from 'express';
import { SocioController } from './socio.controller.js';

const ctrl = new SocioController();
export const socioRouter = Router();


socioRouter.get('/', ctrl.getAllSocios.bind(ctrl));
socioRouter.get('/:dni', ctrl.getOneSocioByDni.bind(ctrl));

socioRouter.post('/', ctrl.createSocio.bind(ctrl));
socioRouter.patch('/:dni', ctrl.patchUpdateSocio.bind(ctrl));
socioRouter.delete('/:dni', ctrl.deleteSocio.bind(ctrl));
socioRouter.post('/:dni/decisiones', ctrl.linkDecision.bind(ctrl));
socioRouter.delete('/:dni/decisiones/:linkId', ctrl.unlinkDecision.bind(ctrl));
socioRouter.get('/:dni/decisiones', ctrl.listDecisiones.bind(ctrl));
socioRouter.post('/:dni/ventas', ctrl.createVentaForSocio.bind(ctrl));
socioRouter.get('/:dni/ventas', ctrl.listVentasBySocio.bind(ctrl));
