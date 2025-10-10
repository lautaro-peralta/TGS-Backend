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
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import { searchDistributorsSchema } from './distributor.schema.js';
// ============================================================================
// CONTROLLER - Distributor
// ============================================================================

/**
 * Controller for handling distributor-related operations.
 * @class DistributorController
 */
export class DistributorController {

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search distributors by name or zone.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by name or zone
   * - by: 'name' | 'zone' (optional, default: 'name') - Field to search
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchDistributors(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchDistributorsSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPagination(req, res, Distributor, {
      entityName: 'distributor',
      em,
      searchFields: (validated.by === 'zone') ? 'zone.name' : 'name',
      buildFilters: () => ({}),
      populate: ['zone'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all distributors with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllDistributors(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Distributor, {
      entityName: 'distributor',
      em,
      buildFilters: () => ({}),
      populate: ['products', 'sales', 'zone'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

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
        { populate: ['products', 'sales', 'zone'] }
      );
      if (!distributor) {
        return ResponseUtil.notFound(res, 'Distributor', dni);
      }
      return ResponseUtil.success(res, 'Distributor found', distributor.toDetailedDTO());
    } catch (err) {
      console.error('Error searching for distributor:', err);
      return res.status(400).json({ error: 'Error searching for distributor' });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

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
      // Extract and validate data
      // ────────────────────────────────
      const { dni, name, address, phone, email, productsIds, zoneId } =
        res.locals.validated?.body ?? req.body;

      // ────────────────────────────────
      // Verify existing distributor
      // ────────────────────────────────
      const existingDistributor = await em.findOne(Distributor, { dni });
      if (existingDistributor) {
        return ResponseUtil.conflict(res, 'A distributor with that DNI already exists', 'dni');
      }

      // ────────────────────────────────
      // Verify zone
      // ────────────────────────────────
      const zone = await em.findOne(Zone, { id: Number(zoneId) });
      if (!zone) {
        return ResponseUtil.notFound(res, 'Zone', zoneId);
      }

      // ────────────────────────────────
      // Create distributor
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
      // Associate products
      // ────────────────────────────────
      if (Array.isArray(productsIds) && productsIds.length > 0) {
        const products = await em.find(Product, {
          id: { $in: productsIds.map(Number) },
        });
        products.forEach((p) => distributor.products.add(p));
      }

      // ────────────────────────────────
      // Save to DB
      // ────────────────────────────────
      await em.persistAndFlush(distributor);
      return ResponseUtil.created(res, 'Distributor created successfully', distributor.toDTO());
    } catch (error) {
      console.error('Error creating distributor:', error);
      return ResponseUtil.internalError(res, 'Error creating distributor', error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

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
        { populate: ['products', 'zone'] }
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
      return ResponseUtil.updated(res, 'Distributor updated successfully', distributor.toDTO());
    } catch (err) {
      console.error('Error in PATCH distributor:', err);
      return ResponseUtil.internalError(res, 'Error updating distributor', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

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
      // Fetch distributor with related data
      // ──────────────────────────────────────────────────────────────────────
      const distributor = await em.findOne(
        Distributor,
        { dni },
        { populate: ['sales', 'products', 'zone'] }
      );
      if (!distributor) {
        return ResponseUtil.error(res, `Distributor with DNI ${dni} not found`, 404);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Check for associated sales
      // ──────────────────────────────────────────────────────────────────────
      if (distributor.sales.isInitialized() && distributor.sales.length > 0) {
        return ResponseUtil.error(
          res,
          `Cannot delete distributor ${distributor.name} (DNI ${dni}) because they have ${distributor.sales.length} sale(s) associated. Please delete or reassign the sales first.`,
          400
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Remove product associations before deleting
      // ──────────────────────────────────────────────────────────────────────
      if (distributor.products.isInitialized() && distributor.products.length > 0) {
        distributor.products.removeAll();
        await em.flush();
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the distributor
      // ──────────────────────────────────────────────────────────────────────
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