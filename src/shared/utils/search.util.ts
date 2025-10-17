import { Request, Response } from 'express';
import {
  EntityName,
  EntityManager,
  FilterQuery,
  OrderDefinition,
  Populate
} from '@mikro-orm/core';
import { ResponseUtil } from './response.util.js';
import { EntityFilters, SearchConfig } from '../types/common.types.js';
import { cacheService, CACHE_TTL } from '../services/cache.service.js';

// ============================================================================ 
// HELPER FUNCTIONS - Filters
// ============================================================================ 

/**
 * Sanitizes a search value to prevent wildcard injection.
 *
 * @param value - Value to sanitize
 * @returns Sanitized value
 *
 * Why: The % and _ characters are wildcards in SQL LIKE.
 * Escaping them prevents unintentional searches.
 */
function sanitizeSearchValue(value: string): string {
  return value.replace(/[%_]/g, '\$&');
}

/**
 * Creates a case-insensitive search filter with sanitization.
 *
 * @param field - Field to search, supports dot notation (e.g., "user.name")
 * @param value - Value to search for
 * @returns FilterQuery with $like operator and wildcards
 *
 * Why $like instead of $ilike:
 * - MySQL is case-insensitive by default in text comparisons
 * - $like is more performant by avoiding LOWER() conversions
 * - If you need case-sensitive, configure the column collation to utf8mb4_bin
 *
 * Dot notation: Allows searching in relationships (e.g., "address.city")
 */
function createTextFilter<T>(field: string, value: string): FilterQuery<T> {
  const sanitizedValue = sanitizeSearchValue(value);

  const keys = field.split('.');
  const lastKey = keys.pop()!;

  // Build the filter from the deepest field upwards
  let filter: EntityFilters = { [lastKey]: { $like: `%${sanitizedValue}%` } };

  // Wrap in nested objects for dot notation
  for (let i = keys.length - 1; i >= 0; i--) {
    filter = { [keys[i]]: filter };
  }

  return filter as FilterQuery<T>;
}

/**
 * Creates an $or filter for searching in multiple fields.
 *
 * @param fields - Array of fields to search in
 * @param value - Value to search for
 * @returns FilterQuery with $or operator
 *
 * Example: ['name', 'email'] with value 'john' generates:
 * { $or: [{ name: { $like: '%john%' }}, { email: { $like: '%john%' }}] }
 */
function createMultiFieldTextFilter<T>(
  fields: string[],
  value: string
): FilterQuery<T> {
  const sanitizedValue = sanitizeSearchValue(value);

  const orConditions = fields.map(field => {
    const keys = field.split('.');
    const lastKey = keys.pop()!;

    let filter: EntityFilters = { [lastKey]: { $like: `%${sanitizedValue}%` } };

    for (let i = keys.length - 1; i >= 0; i--) {
      filter = { [keys[i]]: filter };
    }

    return filter;
  });

  return { $or: orConditions } as FilterQuery<T>;
}

/**
 * Creates a typed sort definition.
 *
 * Why: Centralizes sorting logic and prevents typing errors.
 */
function createOrder<T>(
  field: keyof T | string,
  direction: 'asc' | 'desc' = 'asc'
): OrderDefinition<T> {
  return { [field]: direction } as OrderDefinition<T>;
}

// ============================================================================ 
// HELPER FUNCTIONS - Utilities
// ============================================================================ 

/**
 * Type guard to check if an entity has a toDTO() method.
 *
 * Why: Allows transforming entities to DTOs safely,
 * avoiding exposing internal properties (passwords, timestamps, etc.)
 */
function hasToDTO(obj: unknown): obj is { toDTO: () => unknown } {
  return obj !== null && typeof obj === 'object' && 'toDTO' in obj && typeof (obj as any).toDTO === 'function';
}


/**
 * Search for entities with pagination and complex filters.
 *
 * Features:
 * - Pagination with validation (page, limit)
 * - Optional text search with sanitization (q)
 * - Dynamic filters from query params
 * - Support for numeric range (min/max)
 * - Customizable sorting
 * - Optional Redis caching support
 *
 * Standard query params:
 * - page: page number (default: 1, min: 1)
 * - limit: items per page (default: 10, min: 1, max: 100)
 * - q: search text (optional, min 2 chars)
 *
 * @param req - Express Request
 * @param res - Express Response
 * @param entity - MikroORM Entity
 * @param options - Search options
 *
 * @example
 * // Search with dynamic and text filters
 * await searchEntityWithPagination(req, res, Bribe, {
 *   entityName: 'bribe',
 *   em,
 *   searchFields: 'authority.name', // Field for text search
 *   buildFilters: (query) => {
 *     const filters: any = {};
 *     if (query.paid) filters.paid = query.paid === 'true';
 *     return filters;
 *   },
 *   populate: ['authority', 'sale'],
 *   orderBy: { creationDate: 'DESC' }
 * })
 */
export async function searchEntityWithPagination<T extends { toDTO?: () => any }>(
  req: Request,
  res: Response,
  entity: EntityName<T>,
  options: {
    entityName: string;
    em: EntityManager;
    searchFields?: string | string[]; // Fields for text search
    buildFilters: (query: any) => FilterQuery<T>;
    populate?: Populate<T, string>;
    orderBy?: OrderDefinition<T>;
    defaultLimit?: number;
    maxLimit?: number;
    useCache?: boolean; // Enable caching for this search
    cacheTtl?: number; // Cache TTL in seconds (default: from CACHE_TTL.PRODUCT_LIST)
  }
) {
  try {
    // ──────────────────────────────────────────────────────────────────────
    // Validate and parse pagination
    // ──────────────────────────────────────────────────────────────────────
    const { page = '1', limit = String(options.defaultLimit ?? 10), q } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const maxLimit = options.maxLimit ?? 100;

    if (isNaN(pageNum) || pageNum < 1) {
      return ResponseUtil.validationError(res, 'Validation error', [
        { field: 'page', message: 'Page must be a positive number' },
      ]);
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > maxLimit) {
      return ResponseUtil.validationError(res, 'Validation error', [
        { field: 'limit', message: `Limit must be between 1 and ${maxLimit}` },
      ]);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Validate text search (if applicable)
    // ──────────────────────────────────────────────────────────────────────
    if (q !== undefined && typeof q === 'string') {
      if (q.trim().length < 2) {
        return ResponseUtil.validationError(res, 'Validation error', [
          { field: 'q', message: 'Search query must be at least 2 characters long' },
        ]);
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Build filters
    // ──────────────────────────────────────────────────────────────────────
    let filters = options.buildFilters(req.query);

    // Add text search filter if it exists
    if (q && typeof q === 'string' && q.trim().length >= 2 && options.searchFields) {
      const trimmedQuery = q.trim();
      const searchFilter = Array.isArray(options.searchFields)
        ? createMultiFieldTextFilter<T>(options.searchFields, trimmedQuery)
        : createTextFilter<T>(options.searchFields, trimmedQuery);

      filters = {
        ...filters,
        ...searchFilter,
      };
    }

    // ──────────────────────────────────────────────────────────────────────
    // Execute search with pagination
    // ──────────────────────────────────────────────────────────────────────
    const [results, total] = await options.em.findAndCount(entity, filters, {
      populate: options.populate,
      orderBy: options.orderBy ?? createOrder<T>('id', 'asc'),
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    // ──────────────────────────────────────────────────────────────────────
    // Prepare response
    // ──────────────────────────────────────────────────────────────────────
    const searchInfo = q && typeof q === 'string' ? ` matching "${q}"` : '';
    const message = total === 0
      ? `No ${options.entityName}s found${searchInfo}`
      : `Found ${total} ${options.entityName}${total === 1 ? '' : 's'}${searchInfo}`;

    return ResponseUtil.successList(
      res,
      message,
      results.map((item) => (hasToDTO(item) ? item.toDTO() : item)),
      {
        page: pageNum,
        limit: limitNum,
        total,
      }
    );
  } catch (err) {
    return ResponseUtil.internalError(
      res,
      `Error searching for ${options.entityName}s`,
      err
    );
  }
}

/**
 * Search for entities with pagination and caching support.
 *
 * This function wraps searchEntityWithPagination with intelligent caching
 * to improve performance for frequently accessed data.
 *
 * @param req - Express Request
 * @param res - Express Response
 * @param entity - MikroORM Entity
 * @param options - Search options with cache configuration
 *
 * @example
 * // Search products with caching
 * await searchEntityWithPaginationCached(req, res, Product, {
 *   entityName: 'product',
 *   em,
 *   searchFields: 'description',
 *   buildFilters: (query) => ({ ... }),
 *   useCache: true,
 *   cacheTtl: CACHE_TTL.PRODUCT_LIST
 * })
 */
export async function searchEntityWithPaginationCached<T extends { toDTO?: () => any }>(
  req: Request,
  res: Response,
  entity: EntityName<T>,
  options: {
    entityName: string;
    em: EntityManager;
    searchFields?: string | string[]; // Fields for text search
    buildFilters: (query: any) => FilterQuery<T>;
    populate?: Populate<T, string>;
    orderBy?: OrderDefinition<T>;
    defaultLimit?: number;
    maxLimit?: number;
    useCache?: boolean; // Enable caching for this search
    cacheTtl?: number; // Cache TTL in seconds (default: from CACHE_TTL.PRODUCT_LIST)
  }
) {
  const useCache = options.useCache ?? true;
  const cacheTtl = options.cacheTtl ?? CACHE_TTL.PRODUCT_LIST;

  if (!useCache) {
    return searchEntityWithPagination(req, res, entity, options);
  }

  // Create cache key based on request parameters
  const cacheKey = createSearchCacheKey(req, options.entityName);

  // Try to get from cache first
  const cachedResult = await cacheService.get<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }>(cacheKey);

  if (cachedResult) {
    return ResponseUtil.successList(
      res,
      `Found ${cachedResult.total} ${options.entityName}${cachedResult.total === 1 ? '' : 's'}${req.query.q ? ` matching "${req.query.q}"` : ''} (cached)`,
      cachedResult.data,
      {
        page: cachedResult.page,
        limit: cachedResult.limit,
        total: cachedResult.total,
      }
    );
  }

  // Execute search if not in cache
  const searchResult = await searchEntityWithPagination(req, res, entity, options);

  // Cache the result if search was successful
  if (searchResult) {
    try {
      // Extract data from the response to cache it
      const responseData = res as any;
      if (responseData.statusCode === 200 && responseData.responseData) {
        await cacheService.set(cacheKey, {
          data: responseData.responseData.data,
          total: responseData.responseData.pagination.total,
          page: responseData.responseData.pagination.page,
          limit: responseData.responseData.pagination.limit,
        }, cacheTtl);
      }
    } catch (cacheError) {
      // Don't fail the request if caching fails
      console.warn('Failed to cache search results:', cacheError);
    }
  }

  return searchResult;
}

/**
 * Creates a cache key for search requests based on query parameters.
 * This ensures that different search parameters produce different cache keys.
 */
function createSearchCacheKey(req: Request, entityName: string): string {
  const queryParams = { ...req.query };
  // Remove pagination params from cache key as they don't affect the result data
  delete queryParams.page;
  delete queryParams.limit;

  const sortedParams = Object.keys(queryParams)
    .sort()
    .map(key => `${key}:${queryParams[key]}`)
    .join('|');

  return `search:${entityName}:${sortedParams}`;
}

/**
 * Helper to validate and parse numeric range filters.
 *
 * @param min - Minimum value as a string
 * @param max - Maximum value as a string
 * @param fieldName - Field name for error messages
 * @returns Object with parsed values and validation errors
 */
export function validateRangeFilter(
  min?: string,
  max?: string,
  fieldName: string = 'value'
): {
  minValue?: number;
  maxValue?: number;
  errors: Array<{ field: string; message: string }>;
} {
  const errors: Array<{ field: string; message: string }> = [];
  let minValue: number | undefined;
  let maxValue: number | undefined;

  if (min) {
    minValue = parseFloat(min);
    if (isNaN(minValue) || minValue < 0) {
      errors.push({
        field: `min${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`,
        message: `Minimum ${fieldName} must be a positive number`,
      });
    }
  }

  if (max) {
    maxValue = parseFloat(max);
    if (isNaN(maxValue) || maxValue < 0) {
      errors.push({
        field: `max${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`,
        message: `Maximum ${fieldName} must be a positive number`,
      });
    }
  }

  // Validate range if both are present
  if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
    errors.push({
      field: `min${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`,
      message: `Minimum ${fieldName} cannot be greater than maximum ${fieldName}`,
    });
  }

  return { minValue, maxValue, errors };
}
