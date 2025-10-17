// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { MonthlyReview, ReviewStatus } from './monthlyReview.entity.js';
import { Partner } from '../partner/partner.entity.js';
import { Sale } from '../sale/sale.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { searchMonthlyReviewsSchema, salesStatsSchema } from './monthlyReview.schema.js';
import { MonthlyReviewFilters } from '../../shared/types/common.types.js';

// ============================================================================
// CONTROLLER - MonthlyReview
// ============================================================================

/**
 * Controller for handling monthly review operations and sales statistics
 * @class MonthlyReviewController
 */
export class MonthlyReviewController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search for monthly reviews with filters
   *
   * Query params:
   * - year: number - Filter by year
   * - month: number - Filter by month (1-12)
   * - status: string - Filter by status
   * - partnerDni: string - Filter by reviewer partner DNI
   * - page: number (default: 1)
   * - limit: number (default: 10, max: 100)
   */
  searchMonthlyReviews = async (req: Request, res: Response) => {
    const em = orm.em.fork();

    const validated = validateQueryParams(req, res, searchMonthlyReviewsSchema);
    if (!validated) return;

    return searchEntityWithPagination(req, res, MonthlyReview, {
      entityName: 'monthly-review',
      em,
      buildFilters: () => {
        const { year, month, status, partnerDni } = validated;
        const filters: MonthlyReviewFilters = {};

        if (year) filters.year = year;
        if (month) filters.month = month;
        if (status) filters.status = status;
        if (partnerDni) filters.reviewedBy = { dni: partnerDni };

        return filters;
      },
      populate: ['reviewedBy'] as any,
      orderBy: { year: 'DESC', month: 'DESC' } as any,
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new monthly review
   * Automatically calculates sales statistics for the specified period
   */
  createMonthlyReview = async (req: Request, res: Response) => {
    const em = orm.em.fork();
    const validatedData = res.locals.validated.body;

    try {
      // Find partner
      const partner = await em.findOne(Partner, { dni: validatedData.partnerDni });
      if (!partner) {
        return ResponseUtil.notFound(res, 'Partner', validatedData.partnerDni);
      }

      // Check if review already exists for this period
      const existing = await em.findOne(MonthlyReview, {
        year: validatedData.year,
        month: validatedData.month,
      });

      if (existing) {
        return ResponseUtil.conflict(
          res,
          `A review for ${existing.getPeriodLabel()} already exists`,
          'period'
        );
      }

      // Calculate sales statistics for this period
      const startDate = new Date(validatedData.year, validatedData.month - 1, 1);
      const endDate = new Date(validatedData.year, validatedData.month, 0, 23, 59, 59, 999);

      const sales = await em.find(Sale, {
        saleDate: { $gte: startDate, $lte: endDate },
      });

      const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.saleAmount, 0);
      const totalSalesCount = sales.length;

      // Create review
      const review = em.create(MonthlyReview, {
        year: validatedData.year,
        month: validatedData.month,
        reviewDate: validatedData.reviewDate ? new Date(validatedData.reviewDate) : new Date(),
        reviewedBy: partner,
        status: validatedData.status || ReviewStatus.PENDING,
        observations: validatedData.observations,
        recommendations: validatedData.recommendations,
        totalSalesAmount,
        totalSalesCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await em.persistAndFlush(review);

      const result = await em.findOne(
        MonthlyReview,
        { id: review.id },
        { populate: ['reviewedBy'] }
      );

      return ResponseUtil.created(
        res,
        'Monthly review created successfully',
        result?.toDTO() || review.toDTO()
      );
    } catch (err: any) {
      logger.error({ err }, 'Error creating monthly review');
      return ResponseUtil.internalError(res, 'Error creating monthly review', err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all monthly reviews with pagination
   */
  getAllMonthlyReviews = async (req: Request, res: Response) => {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, MonthlyReview, {
      entityName: 'monthly-review',
      em,
      buildFilters: () => ({}),
      populate: ['reviewedBy'] as any,
      orderBy: { year: 'DESC', month: 'DESC' } as any,
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single monthly review by ID
   */
  getOneMonthlyReviewById = async (req: Request, res: Response) => {
    const em = orm.em.fork();

    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const review = await em.findOne(
        MonthlyReview,
        { id },
        { populate: ['reviewedBy'] }
      );

      if (!review) {
        return ResponseUtil.notFound(res, 'Monthly Review', id);
      }

      return ResponseUtil.success(
        res,
        'Monthly review found successfully',
        review.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error finding monthly review');
      return ResponseUtil.internalError(res, 'Error finding monthly review', err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Updates a monthly review
   */
  updateMonthlyReview = async (req: Request, res: Response) => {
    const em = orm.em.fork();

    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const review = await em.findOne(
        MonthlyReview,
        { id },
        { populate: ['reviewedBy'] }
      );

      if (!review) {
        return ResponseUtil.notFound(res, 'Monthly Review', id);
      }

      const validatedData = res.locals.validated.body;

      // Update fields
      if (validatedData.status !== undefined) review.status = validatedData.status;
      if (validatedData.observations !== undefined) review.observations = validatedData.observations;
      if (validatedData.recommendations !== undefined) review.recommendations = validatedData.recommendations;
      if (validatedData.reviewDate !== undefined) review.reviewDate = new Date(validatedData.reviewDate);

      await em.flush();

      return ResponseUtil.updated(
        res,
        'Monthly review updated successfully',
        review.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error updating monthly review');
      return ResponseUtil.internalError(res, 'Error updating monthly review', err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a monthly review by ID
   */
  deleteMonthlyReview = async (req: Request, res: Response) => {
    const em = orm.em.fork();

    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' },
        ]);
      }

      const review = await em.findOne(MonthlyReview, { id });
      if (!review) {
        return ResponseUtil.notFound(res, 'Monthly Review', id);
      }

      await em.removeAndFlush(review);

      return ResponseUtil.deleted(res, 'Monthly review deleted successfully');
    } catch (err) {
      logger.error({ err }, 'Error deleting monthly review');
      return ResponseUtil.internalError(res, 'Error deleting monthly review', err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // STATISTICS & DASHBOARD METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get sales statistics for a specific period (monthly or yearly)
   *
   * Query params:
   * - year: number (required)
   * - month: number (optional, 1-12)
   * - groupBy: 'distributor' | 'product' | 'client' | 'day' | 'zone' (optional)
   */
  getSalesStatistics = async (req: Request, res: Response) => {
    const em = orm.em.fork();

    const validated = validateQueryParams(req, res, salesStatsSchema);
    if (!validated) return;

    try {
      const { year, month, groupBy } = validated;

      // Define date range
      let startDate: Date;
      let endDate: Date;

      if (month) {
        // Monthly stats
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        // Yearly stats
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      }

      // Fetch sales with related data
      // Note: Using '*' to ensure all relations are loaded, or explicitly list all needed relations
      const sales = await em.find(
        Sale,
        { saleDate: { $gte: startDate, $lte: endDate } },
        {
          populate: [
            'client',
            'distributor',
            'distributor.zone',
            'details',
            'details.product'
          ] as any
        }
      );

      // Calculate overall statistics
      const totalSales = sales.length;
      const totalAmount = sales.reduce((sum, sale) => {
        const amount = typeof sale.saleAmount === 'number' ? sale.saleAmount : parseFloat(sale.saleAmount as any);
        return sum + amount;
      }, 0);
      const averageAmount = totalSales > 0 ? totalAmount / totalSales : 0;

      // Group by if specified
      let groupedData: any = null;

      if (groupBy === 'distributor') {
        groupedData = this.groupByDistributor(sales);
      } else if (groupBy === 'day') {
        groupedData = this.groupByDay(sales);
      } else if (groupBy === 'client') {
        groupedData = this.groupByClient(sales);
      } else if (groupBy === 'zone') {
        groupedData = this.groupByZone(sales);
      } else if (groupBy === 'product') {
        groupedData = this.groupByProduct(sales);
      }

      const response = {
        period: month
          ? `${this.getMonthName(month)} ${year}`
          : `Year ${year}`,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        summary: {
          totalSales,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          averageAmount: parseFloat(averageAmount.toFixed(2)),
        },
        ...(groupedData && { groupedData }),
      };

      return ResponseUtil.success(
        res,
        'Sales statistics retrieved successfully',
        response
      );
    } catch (err) {
      logger.error({ err }, 'Error calculating sales statistics');
      return ResponseUtil.internalError(res, 'Error calculating sales statistics', err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER METHODS FOR GROUPING
  // ──────────────────────────────────────────────────────────────────────────

  private groupByDistributor(sales: Sale[]) {
    const grouped = new Map<string, { name: string; count: number; amount: number }>();

    sales.forEach((sale) => {
      // Get the distributor entity (unwrap if it's a Ref)
      const distributor = typeof sale.distributor === 'object' && 'unwrap' in sale.distributor
        ? sale.distributor.unwrap()
        : sale.distributor;

      if (!distributor) return;

      const key = distributor.dni;

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: distributor.name,
          count: 0,
          amount: 0,
        });
      }

      const data = grouped.get(key)!;
      data.count++;
      // Ensure saleAmount is treated as a number
      const amount = typeof sale.saleAmount === 'number' ? sale.saleAmount : parseFloat(sale.saleAmount as any);
      data.amount += amount;
    });

    return Array.from(grouped.entries())
      .map(([dni, data]) => ({
        distributorDni: dni,
        distributorName: data.name,
        totalSales: data.count,
        totalAmount: parseFloat(data.amount.toFixed(2)),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private groupByClient(sales: Sale[]) {
    const grouped = new Map<string, { name: string; count: number; amount: number }>();

    sales.forEach((sale) => {
      if (!sale.client) return;

      // Get the client entity (unwrap if it's a Ref)
      const client = typeof sale.client === 'object' && 'unwrap' in sale.client
        ? sale.client.unwrap()
        : sale.client;

      if (!client) return;

      const key = client.dni;

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: client.name,
          count: 0,
          amount: 0,
        });
      }

      const data = grouped.get(key)!;
      data.count++;
      // Ensure saleAmount is treated as a number
      const amount = typeof sale.saleAmount === 'number' ? sale.saleAmount : parseFloat(sale.saleAmount as any);
      data.amount += amount;
    });

    return Array.from(grouped.entries())
      .map(([dni, data]) => ({
        clientDni: dni,
        clientName: data.name,
        totalPurchases: data.count,
        totalAmount: parseFloat(data.amount.toFixed(2)),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private groupByZone(sales: Sale[]) {
    const grouped = new Map<string, { count: number; amount: number }>();

    sales.forEach((sale) => {
      // Get the distributor entity (unwrap if it's a Ref)
      const distributor = typeof sale.distributor === 'object' && 'unwrap' in sale.distributor
        ? sale.distributor.unwrap()
        : sale.distributor;

      if (!distributor) return;

      // Get the zone entity (unwrap if it's a Ref)
      let zone: any = null;
      if (distributor.zone) {
        if (typeof distributor.zone === 'object' && 'unwrap' in distributor.zone) {
          zone = (distributor.zone as any).unwrap();
        } else {
          zone = distributor.zone;
        }
      }

      if (!zone) return;

      const key = zone.name;

      if (!grouped.has(key)) {
        grouped.set(key, { count: 0, amount: 0 });
      }

      const data = grouped.get(key)!;
      data.count++;
      // Ensure saleAmount is treated as a number
      const amount = typeof sale.saleAmount === 'number' ? sale.saleAmount : parseFloat(sale.saleAmount as any);
      data.amount += amount;
    });

    return Array.from(grouped.entries())
      .map(([zoneName, data]) => ({
        zoneName,
        totalSales: data.count,
        totalAmount: parseFloat(data.amount.toFixed(2)),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private groupByProduct(sales: Sale[]) {
    const grouped = new Map<number, { name: string; quantity: number; amount: number }>();

    sales.forEach((sale) => {
      if (!sale.details.isInitialized()) return;

      sale.details.getItems().forEach((detail) => {
        // Access the product - Detail uses Rel<Product> which is directly accessible
        const product = detail.product;

        if (!product || !product.id) return;

        const key = product.id;

        if (!grouped.has(key)) {
          grouped.set(key, {
            name: product.description || 'Unknown Product',
            quantity: 0,
            amount: 0,
          });
        }

        const data = grouped.get(key)!;
        data.quantity += detail.quantity;
        // Ensure subtotal is a number
        const subtotal = typeof detail.subtotal === 'number' ? detail.subtotal : parseFloat(detail.subtotal as any);
        data.amount += subtotal;
      });
    });

    return Array.from(grouped.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        totalQuantitySold: data.quantity,
        totalAmount: parseFloat(data.amount.toFixed(2)),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private groupByDay(sales: Sale[]) {
    const grouped = new Map<string, { count: number; amount: number }>();

    sales.forEach((sale) => {
      const date = sale.saleDate.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!grouped.has(date)) {
        grouped.set(date, { count: 0, amount: 0 });
      }

      const data = grouped.get(date)!;
      data.count++;
      // Ensure saleAmount is treated as a number
      const amount = typeof sale.saleAmount === 'number' ? sale.saleAmount : parseFloat(sale.saleAmount as any);
      data.amount += amount;
    });

    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        totalSales: data.count,
        totalAmount: parseFloat(data.amount.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }
}
