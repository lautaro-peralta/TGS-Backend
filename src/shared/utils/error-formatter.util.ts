// ============================================================================
// ERROR FORMATTER UTILITY - Utilities for error formatting and handling
// ============================================================================

import { Response } from 'express';
import { AppError, ValidationError, NotFoundError, ConflictError, ForbiddenError, InternalServerError } from '../errors/custom-errors.js';
import { ValidationErrorDetail } from '../types/common.types.js';

/**
 * Utility for formatting error responses consistently
 */
export class ErrorFormatter {

  /**
   * Creates a formatted error response
   */
  static formatErrorResponse(
    error: AppError,
    res: Response,
    requestId?: string
  ): Response {
    const isDevelopment = process.env.NODE_ENV === 'development';

    const errorResponse = {
      success: false,
      message: error.message,
      code: error.code,
      requestId: requestId || error.requestId,
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
      res.set('Retry-After', '60');
    }

    if (error.statusCode >= 500) {
      res.set('X-Error-Type', 'ServerError');
    }

    return res.status(error.statusCode).json(errorResponse);
  }

  /**
   * Creates validation errors from different formats
   */
  static createValidationErrors(
    errors: Array<{ field: string; message: string; code?: string }> | string[]
  ): ValidationErrorDetail[] {
    if (typeof errors[0] === 'string') {
      return (errors as string[]).map(error => ({
        field: 'general',
        message: error,
        code: 'VALIDATION_ERROR',
      }));
    }

    return errors as ValidationErrorDetail[];
  }

  /**
   * Creates a validation error from simple errors
   */
  static createValidationError(
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

  /**
   * Creates multiple validation errors from a map
   */
  static createValidationErrorsFromMap(
    errorMap: Record<string, string>
  ): ValidationErrorDetail[] {
    return Object.entries(errorMap).map(([field, message]) => ({
      field,
      message,
      code: 'VALIDATION_ERROR',
    }));
  }

  /**
   * Creates a formatted "not found" error
   */
  static createNotFoundError(
    resource: string,
    identifier?: string | number,
    requestId?: string
  ): NotFoundError {
    return new NotFoundError(resource, identifier, requestId);
  }

  /**
   * Creates a formatted conflict error
   */
  static createConflictError(
    message: string,
    field?: string,
    requestId?: string
  ): ConflictError {
    return new ConflictError(message, field, requestId);
  }

  /**
   * Creates a formatted forbidden error
   */
  static createForbiddenError(
    message?: string,
    requestId?: string
  ): ForbiddenError {
    return new ForbiddenError(message, requestId);
  }

  /**
   * Creates a formatted internal error
   */
  static createInternalError(
    message?: string,
    originalError?: Error | unknown,
    requestId?: string
  ): InternalServerError {
    return new InternalServerError(message, originalError, requestId);
  }

  /**
   * Checks if an error is operational (not a programming bug)
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }

    // For standard errors, assume they are operational if they have a reasonable stack trace
    return !!(error.stack && error.message);
  }

  /**
   * Gets the appropriate HTTP status code for an error
   */
  static getStatusCode(error: Error | AppError): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }

    // Mapping of standard errors to HTTP codes
    if (error.name === 'ValidationError') return 400;
    if (error.name === 'UnauthorizedError') return 401;
    if (error.name === 'ForbiddenError') return 403;
    if (error.name === 'NotFoundError') return 404;

    return 500;
  }

  /**
   * Formats database errors for HTTP responses
   */
  static formatDatabaseError(
    error: any,
    requestId?: string
  ): AppError {
    // If it's already a custom error, return it
    if (error instanceof AppError) {
      return error;
    }

    // Create error based on database error code
    if (error.code || error.errno) {
      return new InternalServerError(
        'Database operation failed',
        error,
        requestId
      );
    }

    // Generic error
    return new InternalServerError(
      error.message || 'Unknown database error',
      error,
      requestId
    );
  }

  /**
   * Creates a user-friendly error message for the end user
   */
  static createUserFriendlyMessage(error: AppError): string {
    // For validation errors, use the specific message
    if (error instanceof ValidationError) {
      return 'Los datos proporcionados no son válidos. Por favor, verifica la información e intenta nuevamente.';
    }

    // For not found errors
    if (error instanceof NotFoundError) {
      return error.message;
    }

    // For conflict errors
    if (error instanceof ConflictError) {
      return 'Ya existe un registro con estos datos. Por favor, verifica la información.';
    }

    // For authorization errors
    if (error.statusCode === 401) {
      return 'Debes iniciar sesión para acceder a esta función.';
    }

    if (error.statusCode === 403) {
      return 'No tienes permisos suficientes para realizar esta acción.';
    }

    // For internal errors, generic message
    if (error.statusCode >= 500) {
      return 'Ha ocurrido un error interno. Por favor, intenta nuevamente más tarde.';
    }

    // Default message
    return error.message || 'Ha ocurrido un error inesperado.';
  }
}

/**
 * Decorator to automatically handle errors in controller methods
 */
export function HandleErrors(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const [req, res, next] = args;

    try {
      return await method.apply(this, args);
    } catch (error) {
      const requestId = req.requestId || 'unknown';

      // Log the error
      console.error(`Error in ${target.constructor.name}.${propertyName}:`, {
        error,
        requestId,
        url: req.url,
        method: req.method,
      });

      // Create formatted error
      const appError = ErrorFormatter.formatDatabaseError(error, requestId);

      // Send error response
      return ErrorFormatter.formatErrorResponse(appError, res, requestId);
    }
  };

  return descriptor;
}
