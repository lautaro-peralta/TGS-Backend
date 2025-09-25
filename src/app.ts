import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import logger from './shared/utils/logger.js';
import { logRoutes } from './shared/utils/pretty.log.js';

import { v7 as uuidv7 } from 'uuid';
import { RequestContext } from '@mikro-orm/core';
import { orm, syncSchema } from './shared/db/orm.js';

import { crearAdminDev, crearZonaDev } from './shared/initDev.js';

import { clienteRouter } from './modules/cliente/cliente.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usuarioRouter } from './modules/auth/usuario.routes.js';
import { ventaRouter } from './modules/venta/venta.routes.js';
import { productoRouter } from './modules/producto/producto.routes.js';
import { autoridadRouter } from './modules/autoridad/autoridad.routes.js';
import { zonaRouter } from './modules/zona/zona.routes.js';
import { sobornoRouter } from './modules/soborno/soborno.routes.js';
import { decisionRouter } from './modules/decision/decision.routes.js';
import { tematicaRouter } from './modules/tematica/tematica.routes.js';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  const start = Date.now();

  req.requestId = uuidv7();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusClass = Math.floor(res.statusCode / 100);

    // Determinar nivel de log basado en status code
    const logLevel =
      statusClass >= 5 ? 'error' : statusClass >= 4 ? 'warn' : 'info';

    res.responseTime = duration;

    logger[logLevel](
      {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
      },
      `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
    );
  });

  res.on('error', (error) => {
    logger.error(
      {
        requestId: req.requestId,
        error: error.message,
      },
      `Response error for ${req.method} ${req.url}`
    );
  });

  next();
});

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
app.use('/api/sobornos', sobornoRouter);
app.use('/api/decisiones', decisionRouter);
app.use('/api/tematicas', tematicaRouter);

//ERROR HANDLERS

app.use((req, res) => {
  logger.warn(
    {
      req,
    },
    'Route not found'
  );
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(
    {
      err: error,
      req,
      requestId: req.requestId,
      stack: error.stack,
    },
    `Unhandled error: ${error.message}`
  );

  res.status(500).json({
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Error interno del servidor',
    requestId: req.requestId,
  });
});

export const initDev = async () => {
  if (process.env.NODE_ENV === 'development') {
    await syncSchema();
    await crearAdminDev();
    await crearZonaDev();

    console.log();
    logRoutes([
      '/api/clientes',
      '/api/auth',
      '/api/usuarios',
      '/api/ventas',
      '/api/autoridades',
      '/api/zonas',
      '/api/productos',
      '/api/sobornos',
      '/api/decisiones',
    ]);
  }
};

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

export { app };
