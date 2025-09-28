import { Router } from 'express';
import { SocioController } from './socio.controller.js';
import { validarCrearSocio, validarPatchSocio } from './socio.schema.js';

const r = Router();
const c = new SocioController();

r.get('/', c.getAllSocios.bind(c));
r.get('/:dni', c.getOneSocioByDni.bind(c));
r.post('/', validarCrearSocio, c.createSocio.bind(c));        // SOLO crea Socio
r.patch('/:dni', validarPatchSocio, c.patchUpdateSocio.bind(c));
r.delete('/:dni', c.deleteSocio.bind(c));

export default r;
