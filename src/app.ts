import cors from 'cors';
import dotenv from 'dotenv';
import 'reflect-metadata';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { RequestContext } from '@mikro-orm/core';
import { orm, syncSchema } from './shared/db/orm.js';

import { crearAdminDev } from './shared/crearAdminDEV.js';

import { clienteRouter } from './modules/cliente/cliente.routes.js';
import authRouter from './modules/auth/auth.routes.js';
import usuarioRouter from './modules/auth/usuario.routes.js';
import { ventaRouter } from './modules/venta/venta.routes.js';


dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});
console.log('Rutas cargadas:');
console.log('/api/clientes');
console.log('/api/auth');
console.log('/api/usuarios');
console.log('/api/ventas');

app.use('/api/clientes', clienteRouter);
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuarioRouter);
app.use('/api/ventas', ventaRouter);


app.use((_, res) => {
  res.status(404).json({ message: 'No se encontró el recurso' });
});

await syncSchema(); // en desarrollo, remover o manejar según ambiente en producción

if (process.env.NODE_ENV === 'development') {
  await crearAdminDev();
}

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000/');
});