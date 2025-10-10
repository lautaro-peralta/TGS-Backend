// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Response } from 'express';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Standard API response structure
 * Ensures consistent response format across all endpoints
 */
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

/**
 * Pagination configuration options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  total?: number;
}

// ============================================================================
// RESPONSE UTILITY CLASS
// ============================================================================

/**
 * Utility class for standardized HTTP responses
 *
 * Provides methods for:
 * - Success responses (200, 201)
 * - Error responses (400, 401, 403, 404, 409, 500)
 * - Paginated list responses
 * - Dynamic message generation
 *
 * All methods return consistent ApiResponse structure
 */
export class ResponseUtil {
  // ──────────────────────────────────────────────────────────────────────────
  // SUCCESS RESPONSES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Standard success response
   *
   * @param res - Express response object
   * @param message - Success message to display
   * @param data - Optional data payload
   * @param statusCode - HTTP status code (default: 200)
   * @param meta - Additional metadata
   * @returns Express response
   *
   * @example
   * ResponseUtil.success(res, 'User found', user);
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
   * Success response for paginated lists
   * Includes pagination metadata (page, limit, total, hasNext/PrevPage)
   *
   * @param res - Express response object
   * @param message - Success message
   * @param data - Array of items
   * @param pagination - Pagination options
   * @param statusCode - HTTP status code (default: 200)
   * @returns Express response with pagination metadata
   *
   * @example
   * ResponseUtil.successList(res, 'Users found', users, { page: 1, limit: 10, total: 50 });
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
   * Resource created successfully (201)
   *
   * @param res - Express response object
   * @param message - Success message
   * @param data - Created resource data
   * @returns Express response with 201 status
   *
   * @example
   * ResponseUtil.created(res, 'User created', newUser);
   */
  static created<T>(res: Response, message: string, data?: T): Response {
    return this.success(res, message, data, 201);
  }

  /**
   * Resource updated successfully (200)
   *
   * @param res - Express response object
   * @param message - Success message
   * @param data - Updated resource data
   * @returns Express response
   *
   * @example
   * ResponseUtil.updated(res, 'User updated', updatedUser);
   */
  static updated<T>(res: Response, message: string, data?: T): Response {
    return this.success(res, message, data, 200);
  }

  /**
   * Resource deleted successfully (200)
   *
   * @param res - Express response object
   * @param message - Success message
   * @returns Express response
   *
   * @example
   * ResponseUtil.deleted(res, 'User deleted');
   */
  static deleted(res: Response, message: string): Response {
    return this.success(res, message, undefined, 200);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ERROR RESPONSES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Standard error response
   *
   * @param res - Express response object
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 400)
   * @param errors - Array of detailed error objects
   * @returns Express response
   *
   * @example
   * ResponseUtil.error(res, 'Operation failed', 400, [{ field: 'email', message: 'Invalid email' }]);
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
   * Validation error response (400)
   * Used when request data fails validation
   *
   * @param res - Express response object
   * @param message - Error message (default: 'Validation error')
   * @param errors - Array of validation errors with field and message
   * @returns Express response
   *
   * @example
   * ResponseUtil.validationError(res, 'Invalid data', [
   *   { field: 'email', message: 'Email is required' },
   *   { field: 'password', message: 'Password is too short' }
   * ]);
   */
  static validationError(
    res: Response,
    message: string = 'Validation error',
    errors: Array<{ field?: string; message: string; code?: string }>
  ): Response {
    return this.error(res, message, 400, errors);
  }

  /**
   * Resource not found error (404)
   *
   * @param res - Express response object
   * @param resource - Resource name (e.g., 'User', 'Product')
   * @param id - Optional resource identifier
   * @returns Express response
   *
   * @example
   * ResponseUtil.notFound(res, 'User', 123);
   * // Output: "User with ID 123 not found"
   */
  static notFound(
    res: Response,
    resource: string = 'Resource',
    id?: string | number
  ): Response {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;

    return this.error(res, message, 404);
  }

  /**
   * Conflict error - duplicate resource (409)
   *
   * @param res - Express response object
   * @param message - Conflict message
   * @param field - Optional field that caused the conflict
   * @returns Express response
   *
   * @example
   * ResponseUtil.conflict(res, 'Email already registered', 'email');
   */
  static conflict(res: Response, message: string, field?: string): Response {
    const errors = field ? [{ field, message, code: 'DUPLICATE' }] : undefined;
    return this.error(res, message, 409, errors);
  }

  /**
   * Unauthorized error (401)
   * Used when authentication is required but not provided or invalid
   *
   * @param res - Express response object
   * @param message - Error message (default: 'Unauthorized')
   * @returns Express response
   *
   * @example
   * ResponseUtil.unauthorized(res, 'Invalid token');
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized'
  ): Response {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden error (403)
   * Used when user is authenticated but lacks permissions
   *
   * @param res - Express response object
   * @param message - Error message (default: 'Insufficient permissions')
   * @returns Express response
   *
   * @example
   * ResponseUtil.forbidden(res, 'You do not have permission to delete users');
   */
  static forbidden(
    res: Response,
    message: string = 'Insufficient permissions'
  ): Response {
    return this.error(res, message, 403);
  }

  /**
   * Internal server error (500)
   * In development, includes error details for debugging
   *
   * @param res - Express response object
   * @param message - Error message (default: 'Internal server error')
   * @param error - Optional error object (included only in development)
   * @returns Express response
   *
   * @example
   * ResponseUtil.internalError(res, 'Error processing request', error);
   */
  static internalError(
    res: Response,
    message: string = 'Internal server error',
    error?: any
  ): Response {
    // Include error details only in development environment
    const errors =
      process.env.NODE_ENV === 'development' && error
        ? [
            {
              message: error.message || 'Unknown error',
              code: 'INTERNAL_ERROR',
            },
          ]
        : undefined;

    return this.error(res, message, 500, errors);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MESSAGE GENERATORS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generates dynamic message for list responses
   * Handles singular/plural forms automatically
   *
   * @param count - Number of items
   * @param resource - Resource name (singular)
   * @param action - Action verb (default: 'found')
   * @returns Formatted message string
   *
   * @example
   * generateListMessage(0, 'user');
   * // Output: "No users found"
   *
   * generateListMessage(1, 'user');
   * // Output: "Found 1 user"
   *
   * generateListMessage(5, 'user');
   * // Output: "Found 5 users"
   */
  static generateListMessage(
    count: number,
    resource: string,
    action: string = 'found'
  ): string {
    if (count === 0) {
      return `No ${resource}s ${action}`;
    }

    const plural = count === 1 ? resource : `${resource}s`;
    return `Found ${count} ${plural}`;
  }

  /**
   * Generates dynamic message for CRUD operations
   *
   * @param operation - Type of operation ('created', 'updated', 'deleted')
   * @param resource - Resource name
   * @param identifier - Optional resource identifier
   * @returns Formatted message string
   *
   * @example
   * generateCrudMessage('created', 'User', 123);
   * // Output: "User with ID 123 created successfully"
   *
   * generateCrudMessage('deleted', 'Product');
   * // Output: "Product deleted successfully"
   */
  static generateCrudMessage(
    operation: 'created' | 'updated' | 'deleted',
    resource: string,
    identifier?: string | number
  ): string {
    const messages = {
      created: `${resource}${identifier ? ` with ID ${identifier}` : ''} created successfully`,
      updated: `${resource}${identifier ? ` with ID ${identifier}` : ''} updated successfully`,
      deleted: `${resource}${identifier ? ` with ID ${identifier}` : ''} deleted successfully`,
    };

    return messages[operation];
  }
}