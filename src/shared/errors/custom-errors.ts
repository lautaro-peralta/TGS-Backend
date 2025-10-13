// ============================================================================
// CUSTOM ERRORS - Clases de errores personalizadas para manejo consistente
// ============================================================================

import { ValidationErrorDetail } from '../types/common.types.js';

/**
 * Error base personalizado que extiende Error estándar
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly validationErrors?: ValidationErrorDetail[];
  public readonly requestId?: string;
  public readonly timestamp: Date;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    validationErrors?: ValidationErrorDetail[],
    code?: string,
    requestId?: string
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.validationErrors = validationErrors;
    this.code = code;
    this.requestId = requestId;
    this.timestamp = new Date();

    // Mantiene el stack trace apropiado
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convierte el error a formato JSON para logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      validationErrors: this.validationErrors,
      code: this.code,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Error de validación de datos de entrada
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    validationErrors: ValidationErrorDetail[],
    requestId?: string
  ) {
    super(message, 400, true, validationErrors, 'VALIDATION_ERROR', requestId);
  }
}

/**
 * Error cuando un recurso no se encuentra
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string | number,
    requestId?: string
  ) {
    const message = identifier
      ? `${resource} with ${typeof identifier === 'number' ? 'ID' : 'identifier'} ${identifier} not found`
      : `${resource} not found`;

    super(message, 404, true, undefined, 'NOT_FOUND', requestId);
  }
}

/**
 * Error de conflicto (ej: recurso ya existe)
 */
export class ConflictError extends AppError {
  constructor(
    message: string,
    field?: string,
    requestId?: string
  ) {
    super(message, 409, true, field ? [{ field, message, code: 'CONFLICT' }] : undefined, 'CONFLICT', requestId);
  }
}

/**
 * Error de acceso prohibido
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = 'You are not allowed to perform this action',
    requestId?: string
  ) {
    super(message, 403, true, undefined, 'FORBIDDEN', requestId);
  }
}

/**
 * Error de autorización requerida
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Authentication required',
    requestId?: string
  ) {
    super(message, 401, true, undefined, 'UNAUTHORIZED', requestId);
  }
}

/**
 * Error interno del servidor
 */
export class InternalServerError extends AppError {
  constructor(
    message: string = 'Internal server error',
    originalError?: Error | unknown,
    requestId?: string
  ) {
    super(message, 500, true, undefined, 'INTERNAL_SERVER_ERROR', requestId);

    // Si hay un error original, lo guardamos para debugging
    if (originalError) {
      (this as any).originalError = originalError;
    }
  }
}

/**
 * Error de base de datos
 */
export class DatabaseError extends AppError {
  public readonly dbCode?: string;
  public readonly dbMessage?: string;

  constructor(
    message: string,
    dbCode?: string,
    dbMessage?: string,
    requestId?: string
  ) {
    super(message, 500, true, undefined, 'DATABASE_ERROR', requestId);
    this.dbCode = dbCode;
    this.dbMessage = dbMessage;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      dbCode: this.dbCode,
      dbMessage: this.dbMessage,
    };
  }
}

/**
 * Error de límite de tasa excedido
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    retryAfter?: number,
    requestId?: string
  ) {
    super(message, 429, true, undefined, 'RATE_LIMIT_EXCEEDED', requestId);

    if (retryAfter) {
      (this as any).retryAfter = retryAfter;
    }
  }
}

/**
 * Error de parámetros inválidos
 */
export class BadRequestError extends AppError {
  constructor(
    message: string = 'Bad request',
    validationErrors?: ValidationErrorDetail[],
    requestId?: string
  ) {
    super(message, 400, true, validationErrors, 'BAD_REQUEST', requestId);
  }
}

/**
 * Error de servicio externo no disponible
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = 'Service temporarily unavailable',
    requestId?: string
  ) {
    super(message, 503, true, undefined, 'SERVICE_UNAVAILABLE', requestId);
  }
}

/**
 * Factory para crear errores basados en condiciones comunes
 */
export class ErrorFactory {
  /**
   * Crea un error basado en el código de error de la base de datos
   */
  static fromDatabaseError(error: any, requestId?: string): DatabaseError {
    let message = 'Database operation failed';
    let dbCode = error.code || error.errno?.toString();

    // Mapeo de códigos de error comunes de MySQL
    switch (dbCode) {
      case 'ER_DUP_ENTRY':
        message = 'Duplicate entry detected';
        break;
      case 'ER_NO_REFERENCED_ROW_2':
        message = 'Referenced record does not exist';
        break;
      case 'ER_ROW_IS_REFERENCED_2':
        message = 'Cannot delete record due to existing references';
        break;
      case 'ER_LOCK_WAIT_TIMEOUT':
        message = 'Database operation timed out';
        break;
      case 'ER_LOCK_DEADLOCK':
        message = 'Database deadlock detected';
        break;
    }

    return new DatabaseError(
      message,
      dbCode,
      error.message || error.sqlMessage,
      requestId
    );
  }

  /**
   * Crea un error de validación desde errores de Zod u otros validadores
   */
  static fromValidationErrors(
    errors: ValidationErrorDetail[],
    requestId?: string
  ): ValidationError {
    const message = errors.length === 1
      ? `Validation failed: ${errors[0].message}`
      : `Validation failed: ${errors.length} errors found`;

    return new ValidationError(message, errors, requestId);
  }

  /**
   * Crea un error basado en el tipo de operación fallida
   */
  static fromOperation(
    operation: string,
    entity: string,
    reason?: string,
    requestId?: string
  ): AppError {
    const message = reason
      ? `Failed to ${operation} ${entity}: ${reason}`
      : `Failed to ${operation} ${entity}`;

    switch (operation.toLowerCase()) {
      case 'create':
        return new ConflictError(message, undefined, requestId);
      case 'read':
      case 'find':
        return new NotFoundError(entity, undefined, requestId);
      case 'update':
        return new BadRequestError(message, undefined, requestId);
      case 'delete':
        return new ForbiddenError(message, requestId);
      default:
        return new InternalServerError(message, undefined, requestId);
    }
  }
}
