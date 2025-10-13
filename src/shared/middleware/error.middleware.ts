// ============================================================================
// ERROR MIDDLEWARE - Middleware global para manejo consistente de errores
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { AppError, InternalServerError, ValidationError, ForbiddenError } from '../errors/custom-errors.js';
import { ValidationErrorDetail } from '../types/common.types.js';

/**
 * Middleware global para manejo de errores
 * Captura todos los errores y los formatea de manera consistente
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const requestId = req.requestId || 'unknown';

  // Log del error con contexto básico (evitar propiedades problemáticas)
  logger.error(
    {
      err: error,
      requestId,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      params: JSON.stringify(req.params),
      // Evitar req.query que puede ser de solo lectura
    },
    `Error in ${req.method} ${req.url}`
  );

  // Si no es un error personalizado, convertirlo
  if (!(error instanceof AppError)) {
    const internalError = new InternalServerError(
      error.message || 'Internal server error',
      error,
      requestId
    );
    return handleAppError(internalError, res, requestId);
  }

  // Manejar error personalizado
  return handleAppError(error, res, requestId);
};

/**
 * Función auxiliar para manejar errores de la aplicación
 */
function handleAppError(error: AppError, res: Response, requestId: string): Response {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Construir respuesta de error
  const errorResponse = {
    success: false,
    message: error.message,
    code: error.code,
    requestId,
    timestamp: error.timestamp.toISOString(),
    ...(error.validationErrors && { errors: error.validationErrors }),
    ...(isDevelopment && {
      stack: error.stack,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    }),
  };

  // Headers adicionales para errores específicos
  if (error.statusCode === 429) {
    res.set('Retry-After', '60'); // 60 segundos por defecto
  }

  if (error.statusCode >= 500) {
    res.set('X-Error-Type', 'ServerError');
  }

  // Enviar respuesta
  return res.status(error.statusCode).json(errorResponse);
}

/**
 * Middleware para capturar errores async/await no manejados
 * Envuelve funciones async para capturar errores automáticamente
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para errores 404 - rutas no encontradas
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `Route ${req.method} ${req.url} not found`,
    404,
    true,
    undefined,
    'ROUTE_NOT_FOUND',
    req.requestId
  );

  next(error);
};

/**
 * Middleware para manejo de errores de validación de parámetros de consulta
 */
export const queryValidationErrorHandler = (
  errors: ValidationErrorDetail[],
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const requestId = req.requestId || 'unknown';

  logger.warn(
    {
      errors,
      requestId,
      url: req.url,
      query: req.query,
    },
    'Query parameter validation failed'
  );

  const validationError = new ValidationError(
    'Query parameter validation failed',
    errors,
    requestId
  );

  return handleAppError(validationError, res, requestId);
};

/**
 * Middleware para manejo de errores de validación de cuerpo de solicitud
 */
export const bodyValidationErrorHandler = (
  errors: ValidationErrorDetail[],
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const requestId = req.requestId || 'unknown';

  logger.warn(
    {
      errors,
      requestId,
      url: req.url,
      method: req.method,
      body: req.body,
    },
    'Request body validation failed'
  );

  const validationError = new ValidationError(
    'Request body validation failed',
    errors,
    requestId
  );

  return handleAppError(validationError, res, requestId);
};

/**
 * Middleware para errores de autenticación
 */
export const authenticationErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const requestId = req.requestId || 'unknown';

  logger.warn(
    {
      requestId,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
    },
    'Authentication failed'
  );

  const authError = new AppError(
    'Authentication required',
    401,
    true,
    undefined,
    'AUTHENTICATION_REQUIRED',
    requestId
  );

  return handleAppError(authError, res, requestId);
};

/**
 * Middleware para errores de autorización
 */
export const authorizationErrorHandler = (
  requiredRole: string,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const requestId = req.requestId || 'unknown';

  logger.warn(
    {
      requestId,
      url: req.url,
      method: req.method,
      requiredRole,
      user: (req as any).user,
    },
    'Authorization failed'
  );

  const authzError = new ForbiddenError(
    `Insufficient permissions. Required role: ${requiredRole}`,
    requestId
  );

  return handleAppError(authzError, res, requestId);
};

/**
 * Función para crear errores de validación desde errores de Zod
 */
export function createValidationErrorsFromZod(
  zodErrors: any[]
): ValidationErrorDetail[] {
  return zodErrors.map(error => ({
    field: error.path?.join('.') || 'unknown',
    message: error.message,
    code: error.code,
  }));
}

/**
 * Función para crear errores de validación desde errores genéricos
 */
export function createValidationError(
  field: string,
  message: string,
  code?: string
): ValidationErrorDetail {
  return {
    field,
    message,
    code,
  };
}
