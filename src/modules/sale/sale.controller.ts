// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';
import { Populate } from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Sale } from './sale.entity.js';
import { Detail } from './detail.entity.js';
import { Client } from '../client/client.entity.js';
import { Product } from '../product/product.entity.js';
import { Authority } from '../authority/authority.entity.js';
import { Bribe } from '../bribe/bribe.entity.js';
import { Distributor } from '../distributor/distributor.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import { searchSalesSchema } from './sale.schema.js';

// ============================================================================
// CONTROLLER - Sale
// ============================================================================

/**
 * Controller for handling sale-related operations.
 * @class SaleController
 */
export class SaleController {

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search sales with multiple criteria.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by client, distributor, or zone name
   * - by: 'client' | 'distributor' | 'zone' - Field to search (required if q is provided)
   * - date: ISO 8601 date - Filter by sale date
   * - type: 'exact' | 'before' | 'after' | 'between' - Date search type (required if date is provided)
   * - endDate: ISO 8601 date - End date (only for type='between')
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchSales(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchSalesSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPagination(req, res, Sale, {
      entityName: 'sale',
      em,
      searchFields: (() => {
        const { by } = validated;
        switch (by) {
          case 'client': return 'client.name';
          case 'distributor': return 'distributor.name';
          case 'zone': return 'distributor.zone.name';
          default: return 'client.name';
        }
      })(),
      buildFilters: () => {
        const { date, type, endDate } = validated;
        const filters: any = {};

        // Filter by date (already validated by Zod)
        if (date && type) {
          const parsedDate = new Date(date);
          const startOfDay = new Date(parsedDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(parsedDate);
          endOfDay.setHours(23, 59, 59, 999);

          switch (type) {
            case 'exact':
              filters.saleDate = { $gte: startOfDay, $lte: endOfDay };
              break;
            case 'before':
              filters.saleDate = { $lte: endOfDay };
              break;
            case 'after':
              filters.saleDate = { $gte: startOfDay };
              break;
            case 'between':
              if (endDate) {
                const parsedEndDate = new Date(endDate);
                const endOfEndDate = new Date(parsedEndDate);
                endOfEndDate.setHours(23, 59, 59, 999);
                filters.saleDate = { $gte: startOfDay, $lte: endOfEndDate };
              }
              break;
          }
        }

        return filters;
      },
      populate: ['distributor', 'distributor.zone', 'client', 'details', 'authority'] as unknown as Populate<Sale, string>,
      orderBy: { saleDate: 'desc' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new sale.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createSale(req: Request, res: Response) {
    const em = orm.em.fork();
    const { clientDni, distributorDni, details, person } = res.locals.validated.body;

    let client = await em.findOne(Client, { dni: clientDni });

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Find distributor (required)
      // ──────────────────────────────────────────────────────────────────────
      const distributor = await em.findOne(Distributor, { dni: distributorDni });
      if (!distributor) {
        return ResponseUtil.notFound(res, 'Distributor', distributorDni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Find or create client
      // ──────────────────────────────────────────────────────────────────────
      if (!client) {
        let basePerson = await em.findOne(BasePersonEntity, {
          dni: clientDni,
        });

        if (!basePerson) {
          if (!person) {
            return res.status(400).json({
              message:
                'The person does not exist, the data is required to create it',
            });
          }

          basePerson = em.create(BasePersonEntity, {
            dni: clientDni,
            name: person.name,
            email: person.email,
            phone: person.phone ?? '-',
            address: person.address ?? '-',
          });
          await em.persistAndFlush(basePerson);
        }

        client = em.create(Client, {
          dni: basePerson.dni,
          name: basePerson.name,
          email: basePerson.email,
          phone: basePerson.phone,
          address: basePerson.address,
        });
        await em.persistAndFlush(client);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create new sale and details
      // ──────────────────────────────────────────────────────────────────────
      const newSale = em.create(Sale, {
        client,
        distributor,
        saleDate: new Date(),
        saleAmount: 0,
        details: [],
      });

      let isIllegalProduct = false;
      let totalIllegalAmount = 0;

      for (const detail of details) {
        const product = await em.findOne(Product, { id: detail.productId });
        if (!product) {
          return res.status(400).send({
            message: `Product with ID ${detail.productId} not found`,
          });
        }

        const newDetail = em.create(Detail, {
          product,
          quantity: detail.quantity,
          subtotal: product.price * detail.quantity,
          sale: newSale,
        });

        if (product.isIllegal) {
          isIllegalProduct = true;
          totalIllegalAmount += newDetail.subtotal;
        }

        newSale.details.add(newDetail);
      }

      newSale.saleAmount = newSale.details
        .getItems()
        .reduce((acc, d) => acc + d.subtotal, 0);

      // ──────────────────────────────────────────────────────────────────────
      // Handle illegal products and bribes
      // ──────────────────────────────────────────────────────────────────────
      if (isIllegalProduct) {
        const authority = await em.findOne(
          Authority,
          { id: { $ne: null } },
          { orderBy: { rank: 'asc' } }
        );

        if (authority) {
          newSale.authority = em.getReference(Authority, authority.id);

          const percentage = Authority.rankToCommission(authority.rank) ?? 0;
          const bribe = em.create(Bribe, {
            authority,
            amount: parseFloat((totalIllegalAmount * percentage).toFixed(2)),
            sale: newSale,
            creationDate: new Date(),
            paid: false,
          });

          em.persist(bribe);
        } else {
          console.warn(
            'Illegal product detected, but no authority is available.'
          );
        }
      }

      await em.persistAndFlush(newSale);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const sale = await em.findOne(
        Sale,
        { id: newSale.id },
        { populate: ['details', 'client', 'authority'] }
      );

      return res.status(201).send({
        message: 'Sale registered successfully',
        data: sale ? sale.toDTO() : null,
      });
    } catch (err: any) {
      console.error('Error registering sale:', err);
      return res
        .status(500)
        .send({ message: err.message || 'Error registering the sale' });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all sales with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllSales(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Sale, {
      entityName: 'sale',
      em,
      buildFilters: () => ({}),
      populate: ['client', 'details', 'authority'] as any,
      orderBy: { saleDate: 'DESC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single sale by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneSaleById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract sale ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch sale by ID with related data
      // ──────────────────────────────────────────────────────────────────────
      const sale = await em.findOne(
        Sale,
        { id },
        { populate: ['client', 'details.product'] }
      );
      if (!sale) {
        return ResponseUtil.notFound(res, 'Sale', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(res, 'Sale found successfully', sale.toDTO());
    } catch (err) {
      console.error('Error searching for sale:', err);
      return ResponseUtil.internalError(
        res,
        'Error searching for the sale',
        err
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates a sale (reassign distributor and/or authority).
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async updateSale(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract sale ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch sale by ID with related data
      // ──────────────────────────────────────────────────────────────────────
      const sale = await em.findOne(
        Sale,
        { id },
        { populate: ['distributor', 'authority', 'client', 'details'] }
      );

      if (!sale) {
        return ResponseUtil.notFound(res, 'Sale', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Extract fields from request body
      // ──────────────────────────────────────────────────────────────────────
      const { distributorDni, authorityDni } = req.body;

      // Validate that at least one of the two is present
      if (!distributorDni && authorityDni === undefined) {
        return ResponseUtil.validationError(res, 'Validation error', [
          {
            field: 'body',
            message: 'At least one of "distributorDni" or "authorityDni" is required'
          },
        ]);
      }

      const updates: string[] = [];

      // ──────────────────────────────────────────────────────────────────────
      // Reassign distributor if provided
      // ──────────────────────────────────────────────────────────────────────
      if (distributorDni) {
        const newDistributor = await em.findOne(Distributor, { dni: distributorDni });
        if (!newDistributor) {
          return ResponseUtil.error(res, `Distributor with DNI ${distributorDni} not found`, 404);
        }
        sale.distributor = newDistributor;
        updates.push(`distributor to ${newDistributor.name} (DNI ${distributorDni})`);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Reassign authority if provided
      // ──────────────────────────────────────────────────────────────────────
      if (authorityDni !== undefined) {
        if (authorityDni === null) {
          // Allow removing the authority
          sale.authority = undefined;
          updates.push('authority removed');
        } else {
          const newAuthority = await em.findOne(Authority, { dni: authorityDni });
          if (!newAuthority) {
            return ResponseUtil.error(res, `Authority with DNI ${authorityDni} not found`, 404);
          }
          sale.authority = newAuthority;
          updates.push(`authority to ${newAuthority.name} (DNI ${authorityDni})`);
        }
      }

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        `Sale #${id} updated: ${updates.join(', ')}`,
        sale.toDTO()
      );
    } catch (err) {
      console.error('Error updating sale:', err);
      return ResponseUtil.internalError(res, 'Error updating sale', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a sale by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteSale(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract sale ID
      // ──────────────────────────────────────────────────────────────────────
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch sale by ID with related data
      // ──────────────────────────────────────────────────────────────────────
      const sale = await em.findOne(
        Sale,
        { id },
        { populate: ['client', 'distributor', 'details'] }
      );

      if (!sale) {
        return ResponseUtil.notFound(res, 'Sale', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Check for associated bribes before deletion
      // ──────────────────────────────────────────────────────────────────────
      const bribesCount = await em.count(Bribe, { sale: sale.id });

      if (bribesCount > 0) {
        return ResponseUtil.error(
          res,
          `Cannot delete sale #${id} because it has ${bribesCount} bribe(s) associated with it. Please delete the bribes first.`,
          400
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the sale (cascade will delete details automatically)
      // ──────────────────────────────────────────────────────────────────────
      await em.removeAndFlush(sale);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(res, 'Sale deleted successfully');
    } catch (err) {
      console.error('Error deleting sale:', err);
      return ResponseUtil.internalError(res, 'Error deleting sale', err);
    }
  }
}