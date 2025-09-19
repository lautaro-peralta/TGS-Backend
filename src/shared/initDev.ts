import argon2 from 'argon2';
import { orm } from './db/orm.js';
import { Usuario, Rol } from '../modules/auth/usuario.entity.js';
import { BaseEntityPersona } from './db/base.persona.entity.js';
import { Zona } from '../modules/zona/zona.entity.js';

export async function crearAdminDev() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('No se ejecuta crearAdminDev fuera de desarrollo');
    return;
  }

  const em = orm.em.fork();

  const emailAdmin = 'admin@local.dev';
  const passwordAdmin = 'admin123'; // Cambialo por la contraseña que prefieras

  const adminExistente = await em.findOne(Usuario, { email: emailAdmin });
  if (adminExistente) {
    console.log();
    console.log('Admin ya existe, no se crea uno nuevo');
    return;
  }

  const hashedPassword = await argon2.hash(passwordAdmin);

  const nuevoAdmin = em.create(BaseEntityPersona, {
    dni: '87654321',
    nombre: 'Administrador',
    email: emailAdmin,
    telefono: '-',
    direccion: '-',
  });
  const userAdmin = em.create(Usuario, {
    username: 'elAdmin123',
    email: emailAdmin,
    roles: [Rol.ADMIN],
    password: hashedPassword,
    persona: nuevoAdmin,
  });

  await em.persistAndFlush([nuevoAdmin, userAdmin]);
  console.log();
  console.log('Admin de desarrollo creado con éxito');
}

export async function crearZonaDev() {
  const em = orm.em.fork();

  // Buscar si ya existe una zona marcada como central
  const sedeCentralExistente = await em.findOne(Zona, { esSedeCentral: true });

  if (sedeCentralExistente) {
    console.log();
    console.log(
      `Sede central ya existe: ${sedeCentralExistente.nombre} (ID: ${sedeCentralExistente.id}), no se crea otra`
    );
    return;
  }

  // Crear nueva zona y marcarla como zona central
  const nuevaZona = new Zona('Zona Central', true);

  await em.persistAndFlush(nuevaZona);
  console.log();
  console.log(`Zona central creada con éxito con ID ${nuevaZona.id}`);
}
