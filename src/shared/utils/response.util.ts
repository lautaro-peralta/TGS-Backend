import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    timestamp: string;
    statusCode: number;
    total?: number;
    page?: number;
    limit?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  total?: number;
}

export class ResponseUtil {
  /**
   * Respuesta exitosa estándar
   */
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: number = 200,
    meta?: Partial<ApiResponse['meta']>
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        statusCode,
        ...meta,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta exitosa para listas con paginación
   */
  static successList<T>(
    res: Response,
    message: string,
    data: T[],
    pagination?: PaginationOptions,
    statusCode: number = 200
  ): Response {
    const { page = 1, limit = 10, total = data.length } = pagination || {};
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        statusCode,
        total,
        page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de error estándar
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 400,
    errors?: Array<{ field?: string; message: string; code?: string }>
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        statusCode,
      },
      errors,
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de error de validación
   */
  static validationError(
    res: Response,
    message: string = 'Error de validación',
    errors: Array<{ field?: string; message: string; code?: string }>
  ): Response {
    return this.error(res, message, 400, errors);
  }

  /**
   * Respuesta de error de recurso no encontrado
   */
  static notFound(
    res: Response,
    resource: string = 'Recurso',
    id?: string | number
  ): Response {
    const message = id 
      ? `${resource} con ID ${id} no encontrado`
      : `${resource} no encontrado`;
    
    return this.error(res, message, 404);
  }

  /**
   * Respuesta de error de conflicto (duplicado)
   */
  static conflict(
    res: Response,
    message: string,
    field?: string
  ): Response {
    const errors = field ? [{ field, message, code: 'DUPLICATE' }] : undefined;
    return this.error(res, message, 409, errors);
  }

  /**
   * Respuesta de error de autorización
   */
  static unauthorized(
    res: Response,
    message: string = 'No autorizado'
  ): Response {
    return this.error(res, message, 401);
  }

  /**
   * Respuesta de error de permisos insuficientes
   */
  static forbidden(
    res: Response,
    message: string = 'Permisos insuficientes'
  ): Response {
    return this.error(res, message, 403);
  }

  /**
   * Respuesta de error interno del servidor
   */
  static internalError(
    res: Response,
    message: string = 'Error interno del servidor',
    error?: any
  ): Response {
    // En desarrollo, incluir detalles del error
    const errors = process.env.NODE_ENV === 'development' && error ? [
      { message: error.message || 'Error desconocido', code: 'INTERNAL_ERROR' }
    ] : undefined;

    return this.error(res, message, 500, errors);
  }

  /**
   * Respuesta de recurso creado exitosamente
   */
  static created<T>(
    res: Response,
    message: string,
    data?: T
  ): Response {
    return this.success(res, message, data, 201);
  }

  /**
   * Respuesta de recurso actualizado exitosamente
   */
  static updated<T>(
    res: Response,
    message: string,
    data?: T
  ): Response {
    return this.success(res, message, data, 200);
  }

  /**
   * Respuesta de recurso eliminado exitosamente
   */
  static deleted(
    res: Response,
    message: string
  ): Response {
    return this.success(res, message, undefined, 200);
  }

  /**
   * Genera mensaje dinámico para listas
   */
  static generateListMessage(
    count: number,
    resource: string,
    action: string = 'encontraron'
  ): string {
    if (count === 0) {
      return `No se encontraron ${resource}s`;
    }
    
    const verb = count === 1 ? action.replace('encontraron', 'encontró') : action;
    const plural = count === 1 ? resource : `${resource}s`;
    
    return `Se ${verb} ${count} ${plural}`;
  }

  /**
   * Genera mensaje dinámico para operaciones CRUD
   */
  static generateCrudMessage(
    operation: 'created' | 'updated' | 'deleted',
    resource: string,
    identifier?: string | number
  ): string {
    const messages = {
      created: `${resource}${identifier ? ` con ID ${identifier}` : ''} creado exitosamente`,
      updated: `${resource}${identifier ? ` con ID ${identifier}` : ''} actualizado exitosamente`,
      deleted: `${resource}${identifier ? ` con ID ${identifier}` : ''} eliminado exitosamente`,
    };

    return messages[operation];
  }
}