import { orm } from '../shared/db/orm.js';
import { Zona } from '../modules/zona/zona.entity.js';

export async function crearZonaDev() {
  const em = orm.em.fork();

  // Buscar si ya existe una zona marcada como central
  const sedeCentralExistente = await em.findOne(Zona, { esSedeCentral: true });

  if (sedeCentralExistente) {
    console.log(`Sede central ya existe: ${sedeCentralExistente.nombre} (ID: ${sedeCentralExistente.id}), no se crea otra`);
    return;
  }

  // Crear nueva zona y marcarla como zona central
  const nuevaZona = new Zona('Zona Central');
  nuevaZona.esSedeCentral = true;

  await em.persistAndFlush(nuevaZona);
  console.log(`Zona central creada con éxito con ID ${nuevaZona.id}`);
} 