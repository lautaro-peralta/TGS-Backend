// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';
import { SqlEntityManager, Populate } from '@mikro-orm/postgresql';
import { orm } from '../../shared/db/orm.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPaginationCached } from '../../shared/utils/search.util.js';
import { CACHE_TTL } from '../../shared/services/cache.service.js';
import { validateQueryParams, validateBusinessRules } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { Sale } from './sale.entity.js';
import { Client } from '../client/client.entity.js';
import { Distributor } from '../distributor/distributor.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { Product } from '../product/product.entity.js';
import { Detail } from './detail.entity.js';
import { Authority } from '../authority/authority.entity.js';
import { Bribe } from '../bribe/bribe.entity.js';
import { searchSalesSchema } from './sale.schema.js';
import { User, Role } from '../auth/user/user.entity.js';
import { SalesFilters, ChartData } from '../../shared/types/common.types';


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

    // ──────────────────────────────────────────────────────────────────────
    // Get authenticated user and check roles
    // ──────────────────────────────────────────────────────────────────────
    const userId = (req as any).user?.id;
    const user = userId ? await em.findOne(User, { id: userId }, { populate: ['person'] }) : null;
    
    let authorityId: string | number | undefined;
    if (user && (user.roles.includes(Role.PARTNER) || user.roles.includes(Role.AUTHORITY))) {
      const authority = await em.findOne(Authority, { email: user.email });
      if (authority) {
        authorityId = authority.id;
      }
    }

    let distributorDni: string | undefined;
    if (user && user.roles.includes(Role.DISTRIBUTOR)) {
      const distributor = await em.findOne(Distributor, { email: user.email });
      if (distributor) {
        distributorDni = distributor.dni;
      }
    }

    return searchEntityWithPaginationCached(req, res, Sale, {
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
        const filters: SalesFilters = {};

        // If PARTNER or AUTHORITY, filter only sales from their authority
        if (authorityId) {
          (filters as any).authority = authorityId;
        }
        if (distributorDni) {
          (filters as any).distributor = { dni: distributorDni };
        }

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
      populate: ['distributor', 'distributor.zone', 'client', 'details', 'details.product', 'authority'] as unknown as Populate<Sale, string>,
      orderBy: { saleDate: 'desc' } as any,
      useCache: true,
      cacheTtl: CACHE_TTL.SEARCH_RESULTS,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY & CHART METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a summary of sales grouped by date for charting.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response with labels and data.
   */
  async getSalesSummary(req: Request, res: Response) {
    // Cast to SqlEntityManager to access Knex
    const em = orm.em.fork() as SqlEntityManager;
    try {
      const knex = em.getKnex();

      // Use Knex to build the query for MySQL
      const salesSummary = await knex
        .select(knex.raw('DATE(sale_date) as date'))
        .sum('sale_amount as total')
        .from('sale')
        .groupBy(knex.raw('DATE(sale_date)'))
        .orderBy('date', 'asc');

      // Format data for Chart.js
      const labels = salesSummary.map((s: { date: string; total: string }) => {
        const date = new Date(s.date);
        return date.toLocaleDateString('es-AR', { timeZone: 'UTC' });
      });
      const data = salesSummary.map((s: { date: string; total: string }) => parseFloat(s.total));

      return ResponseUtil.success(res, 'Sales summary retrieved successfully', { labels, data });

    } catch (err) {
      logger.error({ err }, 'Error retrieving sales summary');
      return ResponseUtil.internalError(res, 'Error retrieving sales summary', err);
    }
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
    const validatedData = res.locals.validated.body;

    // ──────────────────────────────────────────────────────────────────────
    // Get authenticated user and verify purchase permissions
    // ──────────────────────────────────────────────────────────────────────
    const userId = (req as any).user?.id;
    if (!userId) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const user = await em.findOne(User, { id: userId }, { populate: ['person'] });
    if (!user) {
      return ResponseUtil.notFound(res, 'User', userId);
    }

    // Check if user can make purchases
    if (!user.canPurchase()) {
      const suggestions = user.getPurchaseRequirementSuggestions();
      return ResponseUtil.error(
        res,
        'User cannot make purchases. Complete profile and verify email first.',
        403,
        suggestions.map(suggestion => ({ message: suggestion }))
      );
    }

    // Validate business rules
    const businessErrors = validateBusinessRules('sale', 'create', validatedData);
    if (businessErrors.length > 0) {
      return ResponseUtil.validationError(res, 'Business rule validation failed', businessErrors);
    }

    const { clientDni, distributorDni, details, person } = validatedData;

    // Use authenticated user's DNI as client DNI if not provided
    const personEntity = user.person?.isInitialized?.() ? user.person : await user.person?.load?.();
    const effectiveClientDni = clientDni || (personEntity as any)?.dni;

    if (!effectiveClientDni) {
      return ResponseUtil.validationError(res, 'Client DNI is required', [
        { field: 'clientDni', message: 'Client DNI is required for purchase' }
      ]);
    }

    let client = await em.findOne(Client, { dni: String(effectiveClientDni) });

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Find distributor (required) - Populate zone for bribe assignment
      // ──────────────────────────────────────────────────────────────────────
      const distributor = await em.findOne(Distributor, { dni: String(distributorDni) }, { populate: ['zone'] });
      if (!distributor) {
        return ResponseUtil.notFound(res, 'Distributor', distributorDni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Find or create client
      // ──────────────────────────────────────────────────────────────────────
      if (!client) {
        let basePerson = await em.findOne(BasePersonEntity, {
          dni: String(effectiveClientDni),
        });

        if (!basePerson) {
          if (!person && !user.person) {
            return res.status(400).json({
              message:
                'The person does not exist, the data is required to create it',
            });
          }

          // Use person data from request or from authenticated user
          const personData = person || {
            name: (personEntity as any)?.name,
            email: user.email,
            phone: (personEntity as any)?.phone,
            address: (personEntity as any)?.address,
          };

          basePerson = em.create(BasePersonEntity, {
            dni: String(effectiveClientDni),
            name: personData.name,
            email: personData.email,
            phone: personData.phone ?? '-',
            address: personData.address ?? '-',
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
        // ✅ Buscar autoridad de la MISMA ZONA que el distribuidor
        const distributorZoneId = distributor.zone?.id;

        if (!distributorZoneId) {
          logger.warn({
            distributorDni: distributor.dni,
            distributorName: distributor.name
          }, 'Illegal product detected, but distributor has no zone assigned. Cannot assign bribe to authority.');
        } else {
          // ✅ Buscar TODAS las autoridades de la zona
          const authoritiesInZone = await em.find(
            Authority,
            { zone: distributorZoneId }
          );

          let selectedAuthority: Authority | null = null;

          if (authoritiesInZone.length > 0) {
            // Contar sobornos asignados para cada autoridad
            const authoritiesWithCounts = await Promise.all(
              authoritiesInZone.map(async (auth) => {
                const bribeCount = await em.count(Bribe, { authority: auth.id });
                return { authority: auth, bribeCount };
              })
            );

            // Encontrar el mínimo de sobornos
            const minBribes = Math.min(...authoritiesWithCounts.map(a => a.bribeCount));

            // Filtrar autoridades con el mínimo de sobornos
            const candidatesWithMinBribes = authoritiesWithCounts.filter(
              a => a.bribeCount === minBribes
            );

            // Ordenar por rango ascendente (menor rango = mayor prioridad)
            candidatesWithMinBribes.sort((a, b) => a.authority.rank - b.authority.rank);

            // Encontrar el menor rango entre los candidatos
            const minRank = candidatesWithMinBribes[0].authority.rank;

            // Filtrar solo las autoridades con el menor rango
            const finalCandidates = candidatesWithMinBribes.filter(
              a => a.authority.rank === minRank
            );

            // Seleccionar: si hay una sola, esa; si hay varias, random
            if (finalCandidates.length === 1) {
              selectedAuthority = finalCandidates[0].authority;
              logger.info({
                authorityDni: selectedAuthority.dni,
                authorityName: selectedAuthority.name,
                bribeCount: finalCandidates[0].bribeCount,
                rank: selectedAuthority.rank,
                selectionMethod: 'único con mínimo sobornos y menor rango'
              }, 'Authority selected: only one with minimum bribes and lowest rank');
            } else {
              // Selección random entre las que tienen el mismo mínimo de sobornos y menor rango
              const randomIndex = Math.floor(Math.random() * finalCandidates.length);
              selectedAuthority = finalCandidates[randomIndex].authority;
              logger.info({
                authorityDni: selectedAuthority.dni,
                authorityName: selectedAuthority.name,
                bribeCount: finalCandidates[randomIndex].bribeCount,
                rank: selectedAuthority.rank,
                totalCandidates: finalCandidates.length,
                selectionMethod: 'random entre empate (mismo sobornos y rango)'
              }, 'Authority selected: random among authorities with same bribes and rank');
            }
          }

          if (selectedAuthority) {
            const authority = selectedAuthority;
            newSale.authority = em.getReference(Authority, authority.id);

            const percentage = Authority.rankToCommission(authority.rank) ?? 0;
            const bribe = em.create(Bribe, {
              authority,
              totalAmount: parseFloat((totalIllegalAmount * percentage).toFixed(2)),
              paidAmount: 0,
              sale: newSale,
              creationDate: new Date(),
            } as any);

            em.persist(bribe);
            logger.info({
              authorityDni: authority.dni,
              authorityName: authority.name,
              zoneId: distributorZoneId,
              bribeAmount: parseFloat((totalIllegalAmount * percentage).toFixed(2))
            }, 'Bribe created and assigned to authority from distributor zone');
          } else {
            logger.warn({
              zoneId: distributorZoneId,
              distributorDni: distributor.dni
            }, 'Illegal product detected, but no authority is available in distributor zone.');
          }
        }
      }

      await em.persistAndFlush(newSale);

      // ──────────────────────────────────────────────────────────────────────
      // Assign CLIENT role to user after successful purchase
      // ──────────────────────────────────────────────────────────────────────
      if (!user.roles.includes(Role.CLIENT)) {
        user.roles.push(Role.CLIENT);
        await em.persistAndFlush(user);
        logger.info({ userId, email: user.email }, 'User promoted to CLIENT role after first purchase');
      }

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
      logger.error({ err }, 'Error registering sale');
      return res
        .status(500)
        .send({ message: err.message || 'Error registering the sale' });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET MY PURCHASES (for authenticated users)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves purchases for the authenticated user (CLIENT role).
   *
   * This endpoint allows clients to view their own purchase history without
   * needing admin permissions.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the user's purchases.
   */
  async getMyPurchases(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Get authenticated user
      // ──────────────────────────────────────────────────────────────────────
      const userId = (req as any).user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, 'Authentication required');
      }

      const user = await em.findOne(User, { id: userId }, { populate: ['person'] });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', userId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Get user's DNI from person entity
      // ──────────────────────────────────────────────────────────────────────
      const personEntity = user.person?.isInitialized?.() ? user.person : await user.person?.load?.();
      const userDni = (personEntity as any)?.dni;

      if (!userDni) {
        return ResponseUtil.error(
          res,
          'Cannot retrieve purchases: User profile is incomplete. Please complete your personal information (DNI) first.',
          400
        );
      }

      logger.info({ userId, userDni, email: user.email }, 'Fetching purchases for authenticated user');

      // ──────────────────────────────────────────────────────────────────────
      // Find all sales where the client DNI matches the user's DNI
      // ──────────────────────────────────────────────────────────────────────
      const sales = await em.find(
        Sale,
        { client: { dni: userDni } },
        {
          populate: ['client', 'distributor', 'distributor.zone', 'details', 'details.product', 'authority'] as any,
          orderBy: { saleDate: 'DESC' } as any
        }
      );

      logger.info({ userId, purchaseCount: sales.length }, 'Purchases retrieved successfully');

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        sales.length === 0
          ? 'No purchases found'
          : `${sales.length} purchase(s) retrieved successfully`,
        sales.map(sale => sale.toDTO())
      );
    } catch (err) {
      logger.error({ err }, 'Error retrieving user purchases');
      return ResponseUtil.internalError(res, 'Error retrieving your purchases', err);
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

    // ──────────────────────────────────────────────────────────────────────
    // Get authenticated user and check roles
    // ──────────────────────────────────────────────────────────────────────
    const userId = (req as any).user?.id;
    const user = userId ? await em.findOne(User, { id: userId }, { populate: ['person'] }) : null;
    
    const filters: any = {};
    
    // If PARTNER or AUTHORITY, filter only sales from their authority
    if (user && (user.roles.includes(Role.PARTNER) || user.roles.includes(Role.AUTHORITY))) {
      // Find authority by user email (must match)
      const authority = await em.findOne(Authority, { email: user.email });
      if (authority) {
        filters.authority = authority.id;
      }
    }

    // If DISTRIBUTOR, filter only sales from that distributor
    if (user && user.roles.includes(Role.DISTRIBUTOR)) {
      const distributor = await em.findOne(Distributor, { email: user.email });
      if (distributor) {
        filters.distributor = { dni: distributor.dni };
      }
    }

    return searchEntityWithPaginationCached(req, res, Sale, {
      entityName: 'sale',
      em,
      buildFilters: () => filters,
      populate: ['client', 'details', 'details.product', 'authority', 'distributor'] as any,
      orderBy: { saleDate: 'DESC' } as any,
      useCache: true,
      cacheTtl: CACHE_TTL.SEARCH_RESULTS,
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
        { populate: ['client', 'details.product', 'authority'] }
      );
      if (!sale) {
        return ResponseUtil.notFound(res, 'Sale', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Check access if user is PARTNER or AUTHORITY
      // ──────────────────────────────────────────────────────────────────────
      const userId = (req as any).user?.id;
      const user = userId ? await em.findOne(User, { id: userId }, { populate: ['person'] }) : null;
      
      if (user && (user.roles.includes(Role.PARTNER) || user.roles.includes(Role.AUTHORITY))) {
        const authority = await em.findOne(Authority, { email: user.email });
        if (authority && sale.authority) {
          const saleAuthority = await em.findOne(Authority, { id: (sale.authority as any).id });
          if (!saleAuthority || saleAuthority.id !== authority.id) {
            return ResponseUtil.error(res, 'Access denied: You can only view sales from your authority', 403);
          }
        } else if (!sale.authority) {
          return ResponseUtil.error(res, 'Access denied: This sale has no associated authority', 403);
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(res, 'Sale found successfully', sale.toDTO());
    } catch (err) {
      logger.error({ err }, 'Error searching for sale');
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
        const newDistributor = await em.findOne(Distributor, { dni: String(distributorDni) });
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
          const newAuthority = await em.findOne(Authority, { dni: String(authorityDni) });
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
      logger.error({ err }, 'Error updating sale');
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
      logger.error({ err }, 'Error deleting sale');
      return ResponseUtil.internalError(res, 'Error deleting sale', err);
    }
  }
}