// ============================================================================
// ERROR FORMATTER UTILITY - Utilidades para formateo y manejo de errores
// ============================================================================

import { Response } from 'express';
import { AppError, ValidationError, NotFoundError, ConflictError, ForbiddenError, InternalServerError } from '../errors/custom-errors.js';
import { ValidationErrorDetail } from '../types/common.types.js';

/**
 * Utilidad para formatear respuestas de error de manera consistente
 */
export class ErrorFormatter {

  /**
   * Crea una respuesta de error formateada
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

    // Headers adicionales para errores específicos
    if (error.statusCode === 429) {
      res.set('Retry-After', '60');
    }

    if (error.statusCode >= 500) {
      res.set('X-Error-Type', 'ServerError');
    }

    return res.status(error.statusCode).json(errorResponse);
  }

  /**
   * Crea errores de validación desde diferentes formatos
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
   * Crea un error de validación desde errores simples
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
   * Crea múltiples errores de validación desde un mapa
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
   * Crea un error de "no encontrado" formateado
   */
  static createNotFoundError(
    resource: string,
    identifier?: string | number,
    requestId?: string
  ): NotFoundError {
    return new NotFoundError(resource, identifier, requestId);
  }

  /**
   * Crea un error de conflicto formateado
   */
  static createConflictError(
    message: string,
    field?: string,
    requestId?: string
  ): ConflictError {
    return new ConflictError(message, field, requestId);
  }

  /**
   * Crea un error de prohibido formateado
   */
  static createForbiddenError(
    message?: string,
    requestId?: string
  ): ForbiddenError {
    return new ForbiddenError(message, requestId);
  }

  /**
   * Crea un error interno formateado
   */
  static createInternalError(
    message?: string,
    originalError?: Error | unknown,
    requestId?: string
  ): InternalServerError {
    return new InternalServerError(message, originalError, requestId);
  }

  /**
   * Verifica si un error es operacional (no es un bug de programación)
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }

    // Para errores estándar, asumir que son operacionales si tienen un stack trace razonable
    return !!(error.stack && error.message);
  }

  /**
   * Obtiene el código de estado HTTP apropiado para un error
   */
  static getStatusCode(error: Error | AppError): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }

    // Mapeo de errores estándar a códigos HTTP
    if (error.name === 'ValidationError') return 400;
    if (error.name === 'UnauthorizedError') return 401;
    if (error.name === 'ForbiddenError') return 403;
    if (error.name === 'NotFoundError') return 404;

    return 500;
  }

  /**
   * Formatea errores de base de datos para respuestas HTTP
   */
  static formatDatabaseError(
    error: any,
    requestId?: string
  ): AppError {
    // Si ya es un error personalizado, devolverlo
    if (error instanceof AppError) {
      return error;
    }

    // Crear error basado en el código de error de la base de datos
    if (error.code || error.errno) {
      return new InternalServerError(
        'Database operation failed',
        error,
        requestId
      );
    }

    // Error genérico
    return new InternalServerError(
      error.message || 'Unknown database error',
      error,
      requestId
    );
  }

  /**
   * Crea un mensaje de error amigable para el usuario final
   */
  static createUserFriendlyMessage(error: AppError): string {
    // Para errores de validación, usar el mensaje específico
    if (error instanceof ValidationError) {
      return 'Los datos proporcionados no son válidos. Por favor, verifica la información e intenta nuevamente.';
    }

    // Para errores de no encontrado
    if (error instanceof NotFoundError) {
      return error.message;
    }

    // Para errores de conflicto
    if (error instanceof ConflictError) {
      return 'Ya existe un registro con estos datos. Por favor, verifica la información.';
    }

    // Para errores de autorización
    if (error.statusCode === 401) {
      return 'Debes iniciar sesión para acceder a esta función.';
    }

    if (error.statusCode === 403) {
      return 'No tienes permisos suficientes para realizar esta acción.';
    }

    // Para errores internos, mensaje genérico
    if (error.statusCode >= 500) {
      return 'Ha ocurrido un error interno. Por favor, intenta nuevamente más tarde.';
    }

    // Mensaje por defecto
    return error.message || 'Ha ocurrido un error inesperado.';
  }
}

/**
 * Decorador para manejar errores en métodos de controlador automáticamente
 */
export function HandleErrors(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const [req, res, next] = args;

    try {
      return await method.apply(this, args);
    } catch (error) {
      const requestId = req.requestId || 'unknown';

      // Log del error
      console.error(`Error in ${target.constructor.name}.${propertyName}:`, {
        error,
        requestId,
        url: req.url,
        method: req.method,
      });

      // Crear error formateado
      const appError = ErrorFormatter.formatDatabaseError(error, requestId);

      // Enviar respuesta de error
      return ErrorFormatter.formatErrorResponse(appError, res, requestId);
    }
  };

  return descriptor;
}
