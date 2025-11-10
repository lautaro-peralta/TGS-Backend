// ============================================================================
// ERROR MIDDLEWARE - Global middleware for consistent error handling
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { AppError, InternalServerError, ValidationError, ForbiddenError } from '../errors/custom-errors.js';
import { ValidationErrorDetail } from '../types/common.types.js';

/**
 * Global middleware for error handling
 * Captures all errors and formats them consistently
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const requestId = req.requestId || 'unknown';

  // Log the error with basic context (avoid problematic properties)
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
      // Avoid req.query which may be read-only
    },
    `Error in ${req.method} ${req.url}`
  );

  // If not a custom error, convert it
  if (!(error instanceof AppError)) {
    const internalError = new InternalServerError(
      error.message || 'Internal server error',
      error,
      requestId
    );
    return handleAppError(internalError, res, requestId);
  }

  // Handle custom error
  return handleAppError(error, res, requestId);
};

/**
 * Helper function to handle application errors
 */
function handleAppError(error: AppError, res: Response, requestId: string): Response {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Build error response
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

  // Additional headers for specific errors
  if (error.statusCode === 429) {
    res.set('Retry-After', '60'); // 60 seconds by default
  }

  if (error.statusCode >= 500) {
    res.set('X-Error-Type', 'ServerError');
  }

  // Send response
  return res.status(error.statusCode).json(errorResponse);
}

/**
 * Middleware to catch unhandled async/await errors
 * Wraps async functions to catch errors automatically
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware for 404 errors - routes not found
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
 * Middleware for handling query parameter validation errors
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
 * Middleware for handling request body validation errors
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
 * Middleware for authentication errors
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
 * Middleware for authorization errors
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
 * Function to create validation errors from Zod errors
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
 * Function to create validation errors from generic errors
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
