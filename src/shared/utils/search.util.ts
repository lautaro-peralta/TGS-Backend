import { Request, Response } from 'express';
import {
  EntityName,
  EntityManager,
  FilterQuery,
  OrderDefinition,
  Populate
} from '@mikro-orm/core';
import { ResponseUtil } from './response.util.js';

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
  let filter: any = { [lastKey]: { $like: `%${sanitizedValue}%` } };

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

    let filter: any = { [lastKey]: { $like: `%${sanitizedValue}%` } };

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
function hasToDTO(obj: any): obj is { toDTO: () => any } {
  return typeof obj?.toDTO === 'function';
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
