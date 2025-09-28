import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Distributor } from './distributor.entity.js';
import { Product } from '../product/product.entity.js';

export class DistributorController {
  async getAllDistributors(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const distributors = await em.find(
        Distributor,
        {},
        { populate: ['products', 'sales'] }
      );
      return res.status(200).json({
        message: `Found ${distributors.length} distributor${distributors.length !== 1 ? 's' : ''}`,
        data: distributors.map((d) => d.toDetailedDTO?.() ?? d),
      });
    } catch (err) {
      console.error('Error getting distributors:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getOneDistributorByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const distributor = await em.findOne(
        Distributor,
        { dni },
        { populate: ['products', 'sales'] }
      );
      if (!distributor) {
        return res.status(404).json({ error: 'Distributor not found' });
      }
      return res.json({
        data: distributor.toDetailedDTO?.() ?? distributor,
      });
    } catch (err) {
      console.error('Error searching for distributor:', err);
      return res.status(400).json({ error: 'Error searching for distributor' });
    }
  }

  async createDistributor(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const {
        dni,
        name,
        address,
        phone,    // required string
        email,       // required string
        productsIds // optional number[]
      } = res.locals.validated?.body ?? req.body;

      if (!dni || !name || !phone || !email) {
        return res.status(400).json({ message: 'Missing mandatory data' });
      }

      const existingDistributor = await em.findOne(Distributor, { dni });
      if (existingDistributor) {
        return res.status(409).json({ error: 'A distributor with that DNI already exists' });
      }

      const distributor = em.create(Distributor, {
        dni,
        name,
        address: address ?? '',
        phone,
        email,
      });

      if (Array.isArray(productsIds) && productsIds.length > 0) {
        const products = await em.find(Product, { id: { $in: productsIds } });
        products.forEach((p) => distributor.products.add(p));
      }

      await em.persistAndFlush(distributor);

      return res.status(201).json({
        message: 'Distributor created successfully',
        data: distributor.toDTO?.() ?? distributor,
      });
    } catch (error) {
      console.error('Error creating distributor:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async patchUpdateDistributor(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const distributor = await em.findOne(
        Distributor,
        { dni },
        { populate: ['products'] }
      );
      if (!distributor) {
        return res.status(404).json({ error: 'Distributor not found' });
      }

      const { productsIds, phone, email, ...updates } =
        res.locals.validated?.body ?? req.body;

      // ⚠️ In your MikroORM version, mergeObjects does not exist in AssignOptions
      em.assign(distributor, {
        ...updates,
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
      }); // <- without mergeObjects

      // Replace N:M products if productsIds comes
      if (Array.isArray(productsIds)) {
        distributor.products.removeAll();
        if (productsIds.length) {
          const newOnes = await em.find(Product, { id: { $in: productsIds } });
          newOnes.forEach((p) => distributor.products.add(p));
        }
      }

      await em.flush();

      return res.status(200).json({
        message: 'Distributor updated successfully',
        data: distributor.toDTO?.() ?? distributor,
      });
    } catch (err) {
      console.error('Error in PATCH distributor:', err);
      return res.status(500).json({ error: 'Error updating distributor' });
    }
  }

  async deleteDistributor(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const distributor = await em.findOne(Distributor, { dni });
      if (!distributor) {
        return res.status(404).json({ error: 'Distributor not found' });
      }

      const name = distributor.name;
      await em.removeAndFlush(distributor);

      return res.status(200).json({
        message: `${name}, DNI ${dni} successfully removed from the list of distributors`,
      });
    } catch (err) {
      console.error('Error deleting distributor:', err);
      return res.status(500).json({ error: 'Error deleting distributor' });
    }
  }
}
