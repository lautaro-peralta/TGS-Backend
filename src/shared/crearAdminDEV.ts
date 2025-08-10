import argon2 from 'argon2';
import { orm } from '../shared/db/orm.js';
import { Usuario, Rol } from '../modules/auth/usuario.entity.js';

export async function crearAdminDev() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('No se ejecuta crearAdminDev fuera de desarrollo');
    return;
  }

  const em = orm.em.fork();

  const emailAdmin = 'admin@local.dev';
  const passwordAdmin = 'admin123';  // Cambialo por la contraseña que prefieras

  const adminExistente = await em.findOne(Usuario, { email: emailAdmin });
  if (adminExistente) {
    console.log('Admin ya existe, no se crea uno nuevo');
    return;
  }

  const hashedPassword = await argon2.hash(passwordAdmin);

  const nuevoAdmin = em.create(Usuario, {
    username:'elAdmin123',
    roles: [Rol.ADMIN],
    password: hashedPassword,
    dni:'87654321',
    nombre: 'Administrador',
    email: emailAdmin,
    telefono:'0000000000',
    direccion:''
  });

  await em.persistAndFlush(nuevoAdmin);
  console.log('Admin de desarrollo creado con éxito');
}