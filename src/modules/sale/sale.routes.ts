import { Router } from 'express';
import { SaleController } from './sale.controller.js';
import { validateWithSchema } from '../../shared/utils/zod.middleware.js';
import { createSaleSchema } from './sale.schema.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { Role } from '../auth/user.entity.js';
//add distributor authentication to see their sales
//in distribMiddleware, it must also be accessible if it is the admin

export const saleRouter = Router();
const saleController = new SaleController();

saleRouter.get(
  '/',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  saleController.getAllSales
);

// saleRouter.get('/mine',
//   authMiddleware, distribMiddleware,
//   getAllMySales
// );

saleRouter.get(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  saleController.getOneSaleById
);

saleRouter.post(
  '/',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]) /* --> distribMiddleware, */,
  validateWithSchema({ body: createSaleSchema }),
  saleController.createSale
);
/*
saleRouter.delete(
  '/:id',
  //authMiddleware,
  //rolesMiddleware([Role.ADMIN]),
  saleController.deleteSale
);*/
