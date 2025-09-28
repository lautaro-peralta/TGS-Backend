import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import logger from './shared/utils/logger.js';
import { logRoutes } from './shared/utils/pretty.log.js';

import { v7 as uuidv7 } from 'uuid';
import { RequestContext } from '@mikro-orm/core';
import { orm, syncSchema } from './shared/db/orm.js';

import { createAdminDev, createZoneDev } from './shared/initDev.js';

import { clientRouter } from './modules/client/client.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/auth/user.routes.js';
import { saleRouter } from './modules/sale/sale.routes.js';
import { productRouter } from './modules/product/product.routes.js';
import { authorityRouter } from './modules/authority/authority.routes.js';
import { zoneRouter } from './modules/zone/zone.routes.js';
import { distributorRouter } from './modules/distributor/distributor.routes.js';
import { bribeRouter } from './modules/bribe/bribe.routes.js';
import { decisionRouter } from './modules/decision/decision.routes.js';
import { topicRouter } from './modules/topic/topic.routes.js';
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
app.use('/api/users', userRouter);
app.use('/api/clients', clientRouter);
app.use('/api/sales', saleRouter);
app.use('/api/products', productRouter);
app.use('/api/zones', zoneRouter);
app.use('/api/authorities', authorityRouter);
app.use('/api/distributors', distributorRouter);
app.use('/api/bribes', bribeRouter);
app.use('/api/decisions', decisionRouter);
app.use('/api/themes', topicRouter);

//ERROR HANDLERS

app.use((req, res) => {
  logger.warn(
    {
      req,
    },
    'Route not found'
  );
  res.status(404).json({ message: 'Route not found' });
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
        : 'Internal server error',
    requestId: req.requestId,
  });
});

export const initDev = async () => {
  if (process.env.NODE_ENV === 'development') {
    await syncSchema();
    await createAdminDev();
    await createZoneDev();

    console.log();
    logRoutes([
      '/api/clients',
      '/api/auth',
      '/api/users',
      '/api/sales',
      '/api/authorities',
      '/api/zones',
      '/api/products',
      '/api/bribes',
      '/api/decisions',
      '/api/themes',
      '/api/distributors',
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
