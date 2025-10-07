// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';
import { FilterQuery, Populate } from '@mikro-orm/core';

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
import { Zone } from '../zone/zone.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityByDate, searchEntity  } from '../../shared/utils/search.util.js';

// ============================================================================
// CONTROLLER - Sale
// ============================================================================

/**
 * Controller for handling sale-related operations.
 * @class SaleController
 */
export class SaleController {

  /**
   * Search sales with multiple criteria.
   *
   * Query params:
   * - q: string (min 2 chars) - Búsqueda de texto (requerido si no viene date)
   * - by: 'client' | 'distributor' | 'zone' (required si viene q) - Dónde buscar
   * - date: ISO 8601 date - Búsqueda por fecha
   * - type: 'exact' | 'before' | 'after' | 'between' - Tipo de búsqueda por fecha (requerido si viene date)
   * - endDate: ISO 8601 date - Fecha final (solo para type='between')
   *
   * Nota: Si viene 'date', se ignoran los parámetros 'q' y 'by'
   */
  async searchSales(req: Request, res: Response) {
    const em = orm.em.fork();

    const { date, by } = req.query as {
      date?: string;
      by?: 'client' | 'distributor' | 'zone';
    };

    // Si viene 'date', delegar a búsqueda por fecha
    if (date) {
      return searchEntityByDate(req, res, Sale, 'saleDate', {
        entityName: 'sale',
        em,
        populate: ['distributor', 'distributor.zone', 'client', 'details', 'authority'] as unknown as Populate<Sale, string>,
      });
    }

    // Validar que venga el parámetro 'by' para búsqueda por texto
    if (!by) {
      return ResponseUtil.validationError(res, 'Validation error', [
        {
          field: 'by',
          message: 'The query parameter "by" is required. Valid values: "client", "distributor", "zone"',
        },
      ]);
    }

    // Validar que 'by' sea un valor válido
    const validByValues = ['client', 'distributor', 'zone'];
    if (!validByValues.includes(by)) {
      return ResponseUtil.validationError(res, 'Validation error', [
        {
          field: 'by',
          message: 'The query parameter "by" must be one of: "client", "distributor", "zone"',
        },
      ]);
    }

    // Para búsqueda por zona, necesitamos un enfoque diferente
    if (by === 'zone') {
      const { q } = req.query as { q?: string };

      if (!q || q.trim().length < 2) {
        return ResponseUtil.validationError(res, 'Validation error', [
          {
            field: 'q',
            message: 'The query parameter "q" is required and must be at least 2 characters long.'
          },
        ]);
      }

      const trimmedQuery = q.trim();
      const sanitizedValue = trimmedQuery.replace(/[%_]/g, '\\$&');

      // Buscar zonas que coincidan
      const zones = await em.find(Zone, {
        name: { $like: `%${sanitizedValue}%` }
      });

      if (zones.length === 0) {
        const message = ResponseUtil.generateListMessage(0, 'sale', `that match "${trimmedQuery}"`);
        return ResponseUtil.successList(res, message, []);
      }

      // Buscar ventas de distributors en esas zonas
      const results = await em.find(Sale, {
        distributor: { zone: { $in: zones.map((z: any) => z.id) } }
      }, {
        populate: ['distributor', 'distributor.zone', 'client', 'details', 'authority'] as unknown as Populate<Sale, string>,
        orderBy: { saleDate: 'desc' } as any,
      });

      const message = ResponseUtil.generateListMessage(
        results.length,
        'sale',
        `that match "${trimmedQuery}"`
      );

      return ResponseUtil.successList(
        res,
        message,
        results.map((item) => item.toDTO())
      );
    }

    // Para client y distributor, usar búsqueda normal
    let searchField: string;

    switch (by) {
      case 'client':
        searchField = 'client.name';
        break;
      case 'distributor':
        searchField = 'distributor.name';
        break;
    }

    // Búsqueda de texto
    return searchEntity(
      req,
      res,
      Sale,
      searchField,
      {
        entityName: 'sale',
        em,
        populate: ['distributor', 'distributor.zone', 'client', 'details', 'authority'] as unknown as Populate<Sale, string>,
        orderBy: { saleDate: 'desc' } as any,
      }
    );
  }
  
  /**
   * Retrieves all sales.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllSales(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch all sales with related data
      // ──────────────────────────────────────────────────────────────────────
      const sales = await em.find(
        Sale,
        {},
        { populate: ['client', 'details', 'authority'] }
      );
      const salesDTO = sales.map((s) => s.toDTO());
      const message = ResponseUtil.generateListMessage(salesDTO.length, 'sale');

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.successList(res, message, salesDTO);
    } catch (err) {
      console.error('Error getting sales:', err);
      return ResponseUtil.internalError(res, 'Error getting sales', err);
    }
  }

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