// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Distributor } from './distributor.entity.js';
import { Product } from '../product/product.entity.js';
import { Zone } from '../zone/zone.entity.js';
import { searchEntity } from '../../shared/utils/search.util.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
// ============================================================================
// CONTROLLER - Distributor
// ============================================================================

/**
 * Controller for handling distributor-related operations.
 * @class DistributorController
 */
export class DistributorController {

  async searchDistributors(req: Request, res: Response) {
    const em = orm.em.fork();
    return searchEntity( req, res, Distributor, 'name', 'distributor', em )
  }

  /**
   * Retrieves all distributors.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllDistributors(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch all distributors with related data
      // ──────────────────────────────────────────────────────────────────────
      const distributors = await em.find(
        Distributor,
        {},
        { populate: ['products', 'sales'] }
      );

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.successList(
        res,
        ResponseUtil.generateListMessage(distributors.length, 'distributor'),
        distributors.map((d) => d.toDetailedDTO?.() ?? d)
      );
    } catch (err) {
      console.error('Error getting distributors:', err);
  return ResponseUtil.internalError(res, 'Error getting distributors', err);
    }
  }

  /**
   * Retrieves a single distributor by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneDistributorByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch distributor by DNI with related data
      // ──────────────────────────────────────────────────────────────────────
      const distributor = await em.findOne(
        Distributor,
        { dni },
        { populate: ['products', 'sales'] }
      );
      if (!distributor) {
        return ResponseUtil.notFound(res, 'Distributor', dni);
      }
      return ResponseUtil.success(res, 'Distributor found', distributor.toDetailedDTO?.() ?? distributor);
    } catch (err) {
      console.error('Error searching for distributor:', err);
      return res.status(400).json({ error: 'Error searching for distributor' });
    }
  }

  /**
   * Creates a new distributor.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createDistributor(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────
      // Extraer y validar datos
      // ────────────────────────────────
      const { dni, name, address, phone, email, productsIds, zoneId } =
        res.locals.validated?.body ?? req.body;

      // ────────────────────────────────
      // Verificar distribuidor existente
      // ────────────────────────────────
      const existingDistributor = await em.findOne(Distributor, { dni });
      if (existingDistributor) {
        return ResponseUtil.conflict(res, 'A distributor with that DNI already exists', 'dni');
      }

      // ────────────────────────────────
      // Verificar zona
      // ────────────────────────────────
      const zone = await em.findOne(Zone, { id: Number(zoneId) });
      if (!zone) {
        return ResponseUtil.notFound(res, 'Zone', zoneId);
      }

      // ────────────────────────────────
      // Crear distribuidor
      // ────────────────────────────────
      const distributor = em.create(Distributor, {
        dni,
        name,
        address: address ?? '',
        phone,
        email,
        zone: em.getReference(Zone, zoneId),
        products: [],
      });

      // ────────────────────────────────
      // Asociar productos
      // ────────────────────────────────
      if (Array.isArray(productsIds) && productsIds.length > 0) {
        const products = await em.find(Product, {
          id: { $in: productsIds.map(Number) },
        });
        products.forEach((p) => distributor.products.add(p));
      }

      // ────────────────────────────────
      // Guardar en DB
      // ────────────────────────────────
      await em.persistAndFlush(distributor);
      return ResponseUtil.created(res, 'Distributor created successfully', distributor.toDTO?.() ?? distributor);
    } catch (error) {
      console.error('Error creating distributor:', error);
      return ResponseUtil.internalError(res, 'Error creating distributor', error);
    }
  }

  /**
   * Partially updates an existing distributor using PATCH method.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async patchUpdateDistributor(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch distributor by DNI
      // ──────────────────────────────────────────────────────────────────────
      const distributor = await em.findOne(
        Distributor,
        { dni },
        { populate: ['products'] }
      );
      if (!distributor) {
        return ResponseUtil.notFound(res, 'Distributor', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply partial updates
      // ──────────────────────────────────────────────────────────────────────
      const { productsIds, phone, email, ...updates } =
        res.locals.validated?.body ?? req.body;

      em.assign(distributor, {
        ...updates,
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
      });

      if (Array.isArray(productsIds)) {
        distributor.products.removeAll();
        if (productsIds.length) {
          const newOnes = await em.find(Product, { id: { $in: productsIds } });
          newOnes.forEach((p) => distributor.products.add(p));
        }
      }

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(res, 'Distributor updated successfully', distributor.toDTO?.() ?? distributor);
    } catch (err) {
      console.error('Error in PATCH distributor:', err);
      return ResponseUtil.internalError(res, 'Error updating distributor', err);
    }
  }

  /**
   * Deletes a distributor by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteDistributor(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch and delete the distributor
      // ──────────────────────────────────────────────────────────────────────
      const distributor = await em.findOne(Distributor, { dni });
      if (!distributor) {
        return ResponseUtil.notFound(res, 'Distributor', dni);
      }

      const name = distributor.name;
      await em.removeAndFlush(distributor);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(res, `${name}, DNI ${dni} successfully removed from the list of distributors`);
    } catch (err) {
      console.error('Error deleting distributor:', err);
      return ResponseUtil.internalError(res, 'Error deleting distributor', err);
    }
  }
}
