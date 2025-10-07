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
// TYPES
// ============================================================================

type DateSearchType = "exact" | "before" | "after" | "between";

// ============================================================================
// HELPER FUNCTIONS - Filtros
// ============================================================================

/**
 * Crea un objeto Date local desde un string de fecha.
 * Evita problemas de zona horaria al parsear "YYYY-MM-DD" como fecha local.
 *
 * @param dateString - String de fecha en formato ISO (YYYY-MM-DD)
 * @returns Date object en zona horaria local
 *
 * Por qué: new Date("2025-10-07") se interpreta como UTC,
 * pero queremos la fecha en la zona horaria local del servidor.
 */
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Crea un filtro de fecha con rangos precisos.
 *
 * @param field - Campo de la entidad a filtrar
 * @param date - Fecha base para el filtro (o fecha inicial para 'between')
 * @param type - Tipo de búsqueda
 * @param endDate - Fecha final (solo requerido para type 'between')
 * @returns FilterQuery con operadores de comparación de MikroORM
 *
 * Tipos de búsqueda:
 * - exact: día completo (00:00:00.000 a 23:59:59.999)
 * - before: hasta ese día (inclusive)
 * - after: desde ese día (inclusive)
 * - between: rango entre dos fechas (ambas inclusive)
 *
 * Por qué: MySQL compara datetimes con microsegundos. Usar rangos explícitos
 * (00:00:00.000 a 23:59:59.999) garantiza capturar todos los registros del día.
 */
function createDateFilter<T>(
  field: keyof T,
  date: Date,
  type: DateSearchType,
  endDate?: Date
): FilterQuery<T> {
  // Crear inicio y fin del día en zona horaria local
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
    case "between":
      if (!endDate) {
        throw new Error("End date is required for 'between' search type");
      }
      const endOfEndDate = new Date(endDate);
      endOfEndDate.setHours(23, 59, 59, 999);
      return {
        [field]: { $gte: startOfDay, $lte: endOfEndDate },
      } as FilterQuery<T>;
    default:
      throw new Error("Invalid date search type");
  }
}

/**
 * Sanitiza un valor de búsqueda para prevenir inyección de wildcards.
 *
 * @param value - Valor a sanitizar
 * @returns Valor sanitizado
 *
 * Por qué: Los caracteres % y _ son wildcards en SQL LIKE.
 * Escaparlos previene búsquedas no intencionadas.
 */
function sanitizeSearchValue(value: string): string {
  return value.replace(/[%_]/g, '\\$&');
}

/**
 * Crea un filtro de búsqueda case-insensitive con sanitización.
 *
 * @param field - Campo a buscar, soporta dot notation (ej: "user.name")
 * @param value - Valor a buscar
 * @returns FilterQuery con operador $like y wildcards
 *
 * Por qué $like en lugar de $ilike:
 * - MySQL es case-insensitive por defecto en comparaciones de texto
 * - $like es más performante al evitar conversiones LOWER()
 * - Si necesita case-sensitive, configure el collation de columna a utf8mb4_bin
 *
 * Dot notation: Permite buscar en relaciones (ej: "address.city")
 */
function createTextFilter<T>(field: string, value: string): FilterQuery<T> {
  const sanitizedValue = sanitizeSearchValue(value);

  const keys = field.split('.');
  const lastKey = keys.pop()!;

  // Construye el filtro desde el campo más profundo hacia arriba
  let filter: any = { [lastKey]: { $like: `%${sanitizedValue}%` } };

  // Envuelve en objetos anidados para dot notation
  for (let i = keys.length - 1; i >= 0; i--) {
    filter = { [keys[i]]: filter };
  }

  return filter as FilterQuery<T>;
}

/**
 * Crea un filtro $or para búsqueda en múltiples campos.
 *
 * @param fields - Array de campos donde buscar
 * @param value - Valor a buscar
 * @returns FilterQuery con operador $or
 *
 * Ejemplo: ['name', 'email'] con valor 'john' genera:
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
 * Crea definición de ordenamiento tipada.
 *
 * Por qué: Centraliza la lógica de ordenamiento y previene errores de tipado.
 */
function createOrder<T>(
  field: keyof T | string,
  direction: 'asc' | 'desc' = 'asc'
): OrderDefinition<T> {
  return { [field]: direction } as OrderDefinition<T>;
}

// ============================================================================
// HELPER FUNCTIONS - Utilidades
// ============================================================================

/**
 * Type guard para verificar si una entidad tiene método toDTO().
 *
 * Por qué: Permite transformar entidades a DTOs de forma segura,
 * evitando exponer propiedades internas (passwords, timestamps, etc.)
 */
function hasToDTO(obj: any): obj is { toDTO: () => any } {
  return typeof obj?.toDTO === 'function';
}

/**
 * Extrae el path de populate desde campos (soporta dot notation y arrays).
 *
 * @param fields - Campo único con dot notation o array de campos
 * @returns Array de relaciones a popular
 *
 * @example "user.name" → ["user"]
 * @example ["user.name", "address.city"] → ["user", "address"]
 *
 * Por qué: MikroORM necesita cargar relaciones explícitamente.
 * Sin populate, las búsquedas en relaciones fallan.
 */
function extractPopulatePaths<T>(
  fields: string | string[]
): Populate<T, string> | undefined {
  const fieldsArray = Array.isArray(fields) ? fields : [fields];
  const populatePaths = new Set<string>();

  for (const field of fieldsArray) {
    if (field.includes('.')) {
      populatePaths.add(field.split('.')[0]);
    }
  }

  if (populatePaths.size === 0) return undefined;
  return Array.from(populatePaths) as unknown as Populate<T, string>;
}

/**
 * Combina arrays de populate eliminando duplicados.
 *
 * @param populateArrays - Arrays de populate a combinar
 * @returns Array único de populate
 *
 * Por qué: Al combinar populate de diferentes fuentes (auto-detectado + manual),
 * evitamos duplicados que pueden causar errores.
 */
function mergePopulate<T>(
  ...populateArrays: (Populate<T, string> | undefined)[]
): Populate<T, string> | undefined {
  const merged = new Set<string>();

  for (const populate of populateArrays) {
    if (populate) {
      const arr = Array.isArray(populate) ? populate : [populate];
      arr.forEach(item => merged.add(item as string));
    }
  }

  if (merged.size === 0) return undefined;
  return Array.from(merged) as unknown as Populate<T, string>;
}

// ============================================================================
// EXPORTED SEARCH FUNCTIONS
// ============================================================================

/**
 * Búsqueda de entidades por fecha.
 *
 * Casos de uso:
 * - exact: Registros del día específico
 * - before: Registros hasta esa fecha (inclusive)
 * - after: Registros desde esa fecha (inclusive)
 * - between: Registros en un rango de fechas (ambas inclusive)
 *
 * Query params esperados:
 * - date: ISO 8601 string (ej: "2025-01-15") - Fecha inicial
 * - type: "exact" | "before" | "after" | "between"
 * - endDate: ISO 8601 string (solo requerido si type es "between")
 *
 * @param req - Request de Express
 * @param res - Response de Express
 * @param entity - Entidad de MikroORM
 * @param dateField - Campo de fecha a filtrar
 * @param options - Opciones de búsqueda
 */
export async function searchEntityByDate<T extends { toDTO?: () => any }>(
  req: Request,
  res: Response,
  entity: EntityName<T>,
  dateField: keyof T,
  options: {
    entityName: string;
    em: EntityManager;
    additionalFilters?: FilterQuery<T>;
    populate?: Populate<T, string>;
  }
) {
  try {
    const { date, type, endDate } = req.query as {
      date?: string;
      type?: DateSearchType;
      endDate?: string;
    };

    // Validación de parámetros requeridos
    if (!date || !type) {
      return ResponseUtil.validationError(res, "Validation error", [
        {
          field: "date",
          message: '"date" and "type" query params are required',
        },
      ]);
    }

    // Validación y parseo de fecha inicial usando zona horaria local
    const parsedDate = parseLocalDate(date);
    if (isNaN(parsedDate.getTime())) {
      return ResponseUtil.validationError(res, "Validation error", [
        {
          field: "date",
          message: '"date" must be a valid ISO 8601 date (YYYY-MM-DD)',
        },
      ]);
    }

    // Validación de tipo de búsqueda
    const validTypes: DateSearchType[] = ["exact", "before", "after", "between"];
    if (!validTypes.includes(type)) {
      return ResponseUtil.validationError(res, "Validation error", [
        {
          field: "type",
          message: '"type" must be "exact", "before", "after", or "between"',
        },
      ]);
    }

    // Validación de endDate para tipo "between"
    let parsedEndDate: Date | undefined;
    if (type === "between") {
      if (!endDate) {
        return ResponseUtil.validationError(res, "Validation error", [
          {
            field: "endDate",
            message: '"endDate" is required when type is "between"',
          },
        ]);
      }
      parsedEndDate = parseLocalDate(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return ResponseUtil.validationError(res, "Validation error", [
          {
            field: "endDate",
            message: '"endDate" must be a valid ISO 8601 date (YYYY-MM-DD)',
          },
        ]);
      }
      if (parsedEndDate < parsedDate) {
        return ResponseUtil.validationError(res, "Validation error", [
          {
            field: "endDate",
            message: '"endDate" must be greater than or equal to "date"',
          },
        ]);
      }
    }

    // Construir filtro de fecha
    const dateFilter = createDateFilter(dateField, parsedDate, type, parsedEndDate);

    // Combinar con filtros adicionales
    const where: FilterQuery<T> = {
      ...options.additionalFilters,
      ...dateFilter,
    };

    // Ejecutar búsqueda
    const results = await options.em.find(entity, where, {
      populate: options.populate,
    });

    // Construir mensaje apropiado
    let dateRangeMessage: string;
    if (type === "between" && parsedEndDate) {
      dateRangeMessage = `between ${parsedDate.toISOString().split('T')[0]} and ${parsedEndDate.toISOString().split('T')[0]}`;
    } else {
      dateRangeMessage = `for ${type} ${parsedDate.toISOString().split('T')[0]}`;
    }

    const message = ResponseUtil.generateListMessage(
      results.length,
      options.entityName,
      dateRangeMessage
    );

    // Transformación a DTO si existe
    return ResponseUtil.successList(
      res,
      message,
      results.map((item) => (hasToDTO(item) ? item.toDTO() : item))
    );
  } catch (err) {
    return ResponseUtil.internalError(
      res,
      `Error searching ${options.entityName} by date`,
      err
    );
  }
}

/**
 * Búsqueda de entidades por campos booleanos.
 *
 * Query param esperado:
 * - q: "true" | "false" (string, no boolean)
 *
 * Por qué validar como string: Express convierte query params a strings.
 *
 * @param req - Request de Express
 * @param res - Response de Express
 * @param entity - Entidad de MikroORM
 * @param searchField - Campo booleano a filtrar
 * @param options - Opciones de búsqueda
 */
export async function searchEntityByBoolean<T extends { toDTO?: () => any }>(
  req: Request,
  res: Response,
  entity: EntityName<T>,
  searchField: keyof T,
  options: {
    entityName: string;
    em: EntityManager;
    additionalFilters?: FilterQuery<T>;
    populate?: Populate<T, string>;
  }
) {
  try {
    const { q } = req.query as { q?: string };

    if (q !== 'true' && q !== 'false') {
      return ResponseUtil.validationError(res, 'Validation error', [
        {
          field: 'q',
          message: 'The query parameter "q" must be "true" or "false".'
        },
      ]);
    }

    const value = q === 'true';

    // Construir filtro booleano
    const booleanFilter = { [searchField]: value } as FilterQuery<T>;

    // Combinar con filtros adicionales
    const where: FilterQuery<T> = {
      ...options.additionalFilters,
      ...booleanFilter,
    };

    // Ejecutar búsqueda
    const results = await options.em.find(entity, where, {
      populate: options.populate,
    });

    const message = ResponseUtil.generateListMessage(
      results.length,
      options.entityName,
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
      `Error searching for ${options.entityName} by boolean`,
      err
    );
  }
}

/**
 * Búsqueda genérica de entidades por texto.
 *
 * Características:
 * - Búsqueda case-insensitive con wildcards (LIKE %query%)
 * - Soporta búsqueda en un campo único o múltiples campos (con $or)
 * - Soporta dot notation para relaciones (ej: "user.name")
 * - Auto-populate de relaciones necesarias
 * - Filtros adicionales combinables con AND
 *
 * Query param esperado:
 * - q: string (mínimo 2 caracteres)
 *
 * Por qué mínimo 2 caracteres: Evita queries extremadamente amplias
 * que degradan performance en tablas grandes.
 *
 * @param req - Request de Express
 * @param res - Response de Express
 * @param entity - Entidad de MikroORM
 * @param searchFields - Campo único o array de campos donde buscar
 * @param options - Opciones de búsqueda
 *
 * @example
 * // Búsqueda simple en un campo
 * searchEntity(req, res, Client, 'name', { entityName: 'client', em })
 *
 * @example
 * // Búsqueda en múltiples campos
 * searchEntity(req, res, Sale, ['client.name', 'distributor.name'], {
 *   entityName: 'sale',
 *   em,
 *   populate: ['client', 'distributor']
 * })
 */
export async function searchEntity<T extends { toDTO?: () => any }>(
  req: Request,
  res: Response,
  entity: EntityName<T>,
  searchFields: string | string[],
  options: {
    entityName: string;
    em: EntityManager;
    populate?: Populate<T, string>;
    additionalFilters?: FilterQuery<T>;
    orderBy?: OrderDefinition<T>;
  }
) {
  try {
    const { q } = req.query as { q?: string };

    // Validación de query param
    if (!q || q.trim().length < 2) {
      return ResponseUtil.validationError(res, 'Validation error', [
        {
          field: 'q',
          message: 'The query parameter "q" is required and must be at least 2 characters long.'
        },
      ]);
    }

    const trimmedQuery = q.trim();

    // Crear filtro de búsqueda (simple o múltiple)
    const searchFilter = Array.isArray(searchFields)
      ? createMultiFieldTextFilter<T>(searchFields, trimmedQuery)
      : createTextFilter<T>(searchFields, trimmedQuery);

    // Combinar con filtros adicionales (AND implícito)
    const where: FilterQuery<T> = {
      ...options.additionalFilters,
      ...searchFilter,
    };

    // Determinar populate: prioriza el manual, sino usa auto-detectado
    const autoPopulate = extractPopulatePaths<T>(searchFields);
    const populate = options.populate ?? autoPopulate;

    // Determinar ordenamiento
    const orderBy = options.orderBy ?? createOrder<T>('id', 'asc');

    // Ejecutar búsqueda
    const results = await options.em.find(entity, where, {
      orderBy,
      ...(populate && { populate }),
    });

    const message = ResponseUtil.generateListMessage(
      results.length,
      options.entityName,
      `that match "${trimmedQuery}"`
    );

    return ResponseUtil.successList(
      res,
      message,
      results.map((item) => (hasToDTO(item) ? item.toDTO() : item))
    );
  } catch (err) {
    return ResponseUtil.internalError(
      res,
      `Error searching for ${options.entityName}`,
      err
    );
  }
}