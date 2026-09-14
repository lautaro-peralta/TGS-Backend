// ============================================================================
// ERROR FORMATTER UTILITY - Utilities for error formatting and handling
// ============================================================================

import { Response } from 'express';
import { AppError } from '../errors/custom-errors.js';

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
}
