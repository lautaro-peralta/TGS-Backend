import cors from 'cors';
import express from 'express';
import { RequestContext } from '@mikro-orm/core';
import { orm, syncSchema } from './shared/db/orm.js';

import { crearAdminDev } from './shared/crearAdminDEV.js';
import { crearZonaDev } from './shared/crearZonaDev.js';

import { clienteRouter } from './modules/cliente/cliente.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usuarioRouter } from './modules/auth/usuario.routes.js';
import { ventaRouter } from './modules/venta/venta.routes.js';
import { productoRouter } from './modules/producto/producto.routes.js';
import { autoridadRouter } from './modules/autoridad/autoridad.routes.js';
import { zonaRouter } from './modules/zona/zona.routes.js';
import { sobornoRouter } from './modules/sobornoPendiente/soborno.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuarioRouter);
app.use('/api/clientes', clienteRouter);
app.use('/api/ventas', ventaRouter);
app.use('/api/productos', productoRouter);
app.use('/api/zonas', zonaRouter);
app.use('/api/autoridades', autoridadRouter);
app.use('/api/sobornosPendientes',sobornoRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

export const initDev = async () => {
  if (process.env.NODE_ENV === 'development') {
    await syncSchema();
    await crearAdminDev();
    await crearZonaDev();
    console.log('Rutas cargadas:');
    console.log('/api/clientes', '/api/auth', '/api/usuarios', '/api/ventas', '/api/autoridades', '/api/zonas', '/api/productos');
  }
}

export { app };