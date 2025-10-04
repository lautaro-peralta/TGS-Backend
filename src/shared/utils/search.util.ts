
import { Request, Response } from 'express';
import {
  EntityName,
  EntityManager,
  FilterQuery,
  OrderDefinition,
} from '@mikro-orm/core';
import { ResponseUtil } from './response.util.js';

type DateSearchType = "exact" | "before" | "after";

function createDateFilter<T>(
  field: keyof T,
  date: Date,
  type: DateSearchType
): FilterQuery<T> {
  // Creamos copias para no mutar el original
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  switch (type) {
    case "exact":
      return {
        [field]: { $gte: startOfDay, $lte: endOfDay },
      } as FilterQuery<T>;
    case "before":
      return { [field]: { $lte: endOfDay } } as FilterQuery<T>;
    case "after":
      return { [field]: { $gte: startOfDay } } as FilterQuery<T>;
    default:
      throw new Error("Invalid date search type");
  }
}


/**
 * Helper para crear un FilterQuery tipado.
 */
function createFilter<T>(field: keyof T, value: string): FilterQuery<T> {
  return { [field]: { $like: `%${value}%` } } as FilterQuery<T>;
}

/**
 * Helper para crear un OrderDefinition tipado.
 */
function createOrder<T>(
  field: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): OrderDefinition<T> {
  return { [field]: direction } as OrderDefinition<T>;
}

/**
 * Helper de type guard para verificar si un objeto tiene toDTO().
 */
function hasToDTO(obj: any): obj is { toDTO: () => any } {
  return typeof obj.toDTO === 'function';
}

export async function searchEntityByDate<T extends { toDTO?: () => any }>(
  req: Request,
  res: Response,
  entity: EntityName<T>,
  dateField: keyof T,
  entityNameForMessage: string,
  em: EntityManager
) {
  try {
    const { date, type } = req.query as {
      date?: string;
      type?: DateSearchType;
    };

    if (!date || !type) {
      return ResponseUtil.validationError(res, "Validation error", [
        {
          field: "date",
          message: '"date" and "type" query params are required',
        },
      ]);
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return ResponseUtil.validationError(res, "Validation error", [
        {
          field: "date",
          message: '"date" must be a valid date',
        },
      ]);
    }

    const where = createDateFilter(dateField, parsedDate, type);
    const results = await em.find(entity, where);

    const message = ResponseUtil.generateListMessage(
      results.length,
      entityNameForMessage,
      `for ${type} ${parsedDate.toDateString()}`
    );

    return ResponseUtil.successList(res, message, results);
  } catch (err) {
    return ResponseUtil.internalError(
      res,
      `Error searching ${entityNameForMessage} by date`,
      err
    );
  }
}

/**
 * Búsqueda genérica para campos booleanos.
 */
export async function searchEntityByBoolean<T extends { toDTO?: () => any }>(
  req: Request,
  res: Response,
  entity: EntityName<T>,
  searchField: keyof T,
  entityNameForMessage: string,
  em: EntityManager
) {
  try {
    const { q } = req.query as { q?: string };
    if (q !== 'true' && q !== 'false') {
      return ResponseUtil.validationError(res, 'Validation error', [
        {
          field: 'q',
          message: 'The query parameter "q" must be "true" or "false" for boolean search.'
        },
      ]);
    }
    const value = q === 'true';
    const where = { [searchField]: value } as FilterQuery<T>;
    const results = await em.find(entity, where);
    const message = ResponseUtil.generateListMessage(
      results.length,
      entityNameForMessage,
      `with ${String(searchField)} = ${q}`
    );
    return ResponseUtil.successList(
      res,
      message,
      results.map((item) => (hasToDTO(item) ? item.toDTO() : item))
    );
  } catch (err) {
    return ResponseUtil.internalError(
      res,
      `Error searching for ${entityNameForMessage} by boolean`,
      err
    );
  }
}

/**
 * Función genérica para búsqueda en entidades.
 */
export async function searchEntity<T extends { toDTO?: () => any }>(
  req: Request,
  res: Response,
  entity: EntityName<T>,
  searchField: keyof T,
  entityNameForMessage: string,
  em: EntityManager
) {
  try {
    const { q } = req.query as { q?: string };

    if (!q || q.trim().length < 2) {
      return ResponseUtil.validationError(res, 'Validation error', [
        {
          field: 'q',
          message:
            'The query parameter "q" is required and must be at least 2 characters long.',
        },
      ]);
    }

    const where = createFilter(searchField, q.trim());
    const orderBy = createOrder(searchField, 'asc');

    const results = await em.find(entity, where, { orderBy });

    const message = ResponseUtil.generateListMessage(
      results.length,
      entityNameForMessage,
      `that match "${q}"`
    );

    return ResponseUtil.successList(
      res,
      message,
      results.map((item) => (hasToDTO(item) ? item.toDTO() : item))
    );
  } catch (err) {
    return ResponseUtil.internalError(
      res,
      `Error searching for ${entityNameForMessage}`,
      err
    );
  }
}
