// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodType } from 'zod';
import { ResponseUtil } from '../utils/response.util.js';
import logger from '../utils/logger.js';
import {
  nameSchema,
  emailSchema,
  phoneSchema,
  descriptionSchema,
  detailSchema,
  moneySchema,
  quantitySchema,
} from '../schemas/common.schema.js';

// ============================================================================
// VALIDATION FUNCTIONS (for use in controllers)
// ============================================================================

/**
 * Validates request query parameters using a Zod schema.
 * Returns validated data or null (if validation failed, response is already sent).
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param schema - Zod schema for validation
 * @returns Validated data or null
 *
 * @example
 * const validated = validateQueryParams(req, res, searchProductsSchema);
 * if (!validated) return; // Error response already sent
 * // Use validated.page, validated.limit, etc.
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  req: Request,
  res: Response,
  schema: T
): z.infer<T> | null {
  try {
    const validated = schema.parse(req.query);
    return validated;
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      ResponseUtil.validationError(res, 'Validation error', errors);
      return null;
    }
    // Unexpected error
    ResponseUtil.internalError(res, 'Validation error', err);
    return null;
  }
}

/**
 * Validates request body using a Zod schema.
 * Returns validated data or null (if validation failed, response is already sent).
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param schema - Zod schema for validation
 * @returns Validated data or null
 *
 * @example
 * const validated = validateRequestBody(req, res, createProductSchema);
 * if (!validated) return; // Error response already sent
 * // Use validated.price, validated.description, etc.
 */
export function validateRequestBody<T extends z.ZodTypeAny>(
  req: Request,
  res: Response,
  schema: T
): z.infer<T> | null {
  try {
    const validated = schema.parse(req.body);
    return validated;
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      ResponseUtil.validationError(res, 'Validation error', errors);
      return null;
    }
    // Unexpected error
    ResponseUtil.internalError(res, 'Validation error', err);
    return null;
  }
}

/**
 * Validates request params using a Zod schema.
 * Returns validated data or null (if validation failed, response is already sent).
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param schema - Zod schema for validation
 * @returns Validated data or null
 *
 * @example
 * const validated = validateRequestParams(req, res, paramsSchema);
 * if (!validated) return; // Error response already sent
 * // Use validated.id, etc.
 */
export function validateRequestParams<T extends z.ZodTypeAny>(
  req: Request,
  res: Response,
  schema: T
): z.infer<T> | null {
  try {
    const validated = schema.parse(req.params);
    return validated;
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      ResponseUtil.validationError(res, 'Validation error', errors);
      return null;
    }
    // Unexpected error
    ResponseUtil.internalError(res, 'Validation error', err);
    return null;
  }
}

// ============================================================================
// VALIDATION MIDDLEWARE (for use in routes)
// ============================================================================

/**
 * Creates a middleware that validates different parts of the request using Zod schemas.
 *
 * Validates:
 * - Request body (req.body)
 * - Route parameters (req.params)
 * - Query string (req.query)
 *
 * Validated data is stored in res.locals.validated for type-safe access.
 *
 * @param schemas - Object containing Zod schemas for different request parts
 * @returns Express middleware function
 *
 * @example
 * router.post('/users',
 *   validateWithSchema({
 *     body: createUserSchema,
 *     query: z.object({ notify: z.boolean().optional() })
 *   }),
 *   createUserHandler
 * );
 */
export const validateWithSchema = (schemas: {
  body?: ZodType<any>;
  params?: ZodType<any>;
  query?: ZodType<any>;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // ──────────────────────────────────────────────────────────────────────
    // Initialize validation state
    // ──────────────────────────────────────────────────────────────────────
    const errors: any[] = [];
    res.locals.validated = {};

    // ──────────────────────────────────────────────────────────────────────
    // Validate request body
    // ──────────────────────────────────────────────────────────────────────
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((e) => ({
            source: 'body',
            field: e.path.join('.'),
            message: e.message,
          }))
        );
      } else {
        res.locals.validated.body = result.data;
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Validate route parameters
    // ──────────────────────────────────────────────────────────────────────
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((e) => ({
            source: 'params',
            field: e.path.join('.'),
            message: e.message,
          }))
        );
      } else {
        res.locals.validated.params = result.data;
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Validate query string
    // ──────────────────────────────────────────────────────────────────────
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((e) => ({
            source: 'query',
            field: e.path.join('.'),
            message: e.message,
          }))
        );
      } else {
        res.locals.validated.query = result.data;
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Return errors or proceed
    // ──────────────────────────────────────────────────────────────────────
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation error',
        errors,
      });
    }

    next();
  };
};

// ============================================================================
// ADVANCED VALIDATION & SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Middleware for automatic input sanitization
 * Applies professional sanitization to common input types
 */
export const autoSanitize = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      (req.query as any)[key] = sanitizeValue(value);
    }
  }

  // Sanitize route parameters
  for (const [key, value] of Object.entries(req.params)) {
    if (typeof value === 'string') {
      (req.params as any)[key] = sanitizeValue(value);
    }
  }

  // Sanitize request body if it's an object
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
};

/**
 * Sanitizes a string value based on common patterns
 */
function sanitizeValue(value: string): string {
  if (typeof value !== 'string') return value;

  return value
    // Remove potentially dangerous characters
    .replace(/[<>'"&]/g, '')
    // Normalize whitespace
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Recursively sanitizes an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeValue(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Advanced validation function with detailed error reporting
 */
export function validateWithEnhancedReporting<T extends z.ZodTypeAny>(
  req: Request,
  res: Response,
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
): z.infer<T> | null {
  try {
    const data = req[source as keyof Request] as any;
    const validated = schema.parse(data);

    // Log successful validation for monitoring
    logger.info({
      source,
      endpoint: req.url,
      method: req.method,
    }, `Validation successful for ${source}`);

    return validated;
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
        value: (issue as any).received,
      }));

      logger.warn({
        source,
        endpoint: req.url,
        method: req.method,
        errors,
      }, `Validation failed for ${source}`);

      ResponseUtil.validationError(res, `Validation failed for ${source}`, errors);
      return null;
    }

    // Unexpected error
    logger.error({
      err,
      source,
      endpoint: req.url,
      method: req.method,
    }, `Unexpected validation error for ${source}`);

    ResponseUtil.internalError(res, 'Validation error', err);
    return null;
  }
}

/**
 * Validates and transforms data with automatic type conversion
 */
export function validateAndTransform<T extends z.ZodTypeAny>(
  req: Request,
  res: Response,
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
): z.infer<T> | null {
  try {
    const data = req[source as keyof Request] as any;

    // Apply transformations and validations
    const validated = schema.parse(data);

    // Store validated data for use in controllers
    if (source === 'body') {
      (req as any).validated = { body: validated };
    } else if (source === 'query') {
      (req as any).validated = { ...((req as any).validated || {}), query: validated };
    } else if (source === 'params') {
      (req as any).validated = { ...((req as any).validated || {}), params: validated };
    }

    return validated;
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
        expected: (issue as any).expected,
        received: (issue as any).received,
      }));

      logger.warn({
        source,
        endpoint: req.url,
        method: req.method,
        errors,
      }, `Validation and transformation failed for ${source}`);

      ResponseUtil.validationError(res, `Validation failed for ${source}`, errors);
      return null;
    }

    logger.error({
      err,
      source,
      endpoint: req.url,
      method: req.method,
    }, `Unexpected validation error for ${source}`);

    ResponseUtil.internalError(res, 'Validation error', err);
    return null;
  }
}

/**
 * Creates a validation middleware with enhanced error handling
 */
export const createValidationMiddleware = (
  schema: ZodType<any>,
  source: 'body' | 'query' | 'params' = 'body',
  options?: {
    sanitize?: boolean;
    transform?: boolean;
    logSuccess?: boolean;
  }
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Apply automatic sanitization if requested
    if (options?.sanitize !== false) {
      autoSanitize(req, res, () => {});
    }

    // Choose validation function based on options
    let validated: any;

    if (options?.transform) {
      validated = validateAndTransform(req, res, schema, source);
    } else {
      validated = validateWithEnhancedReporting(req, res, schema, source);
    }

    if (!validated) {
      return; // Error response already sent
    }

    // Log successful validation if requested
    if (options?.logSuccess) {
      logger.info({
        source,
        endpoint: req.url,
        method: req.method,
        dataSize: JSON.stringify(validated).length,
      }, `Validation successful for ${source}`);
    }

    next();
  };
};

/**
 * Validates file uploads with size and type restrictions
 */
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
  } = {}
) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    required = false,
  } = options;

  // Check if file exists
  if (required && !(req as any).file && !(req as any).files) {
    return ResponseUtil.validationError(res, 'File upload required', [
      { field: 'file', message: 'File is required' }
    ]);
  }

  // Validate single file upload
  if ((req as any).file) {
    const file = (req as any).file;
    // Check file size
    if (file.size > maxSize) {
      return ResponseUtil.validationError(res, 'File too large', [
        { field: 'file', message: `File size cannot exceed ${maxSize / (1024 * 1024)}MB` }
      ]);
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return ResponseUtil.validationError(res, 'Invalid file type', [
        { field: 'file', message: `File type must be one of: ${allowedTypes.join(', ')}` }
      ]);
    }
  }

  // Validate multiple file uploads
  if ((req as any).files && Array.isArray((req as any).files)) {
    for (let i = 0; i < (req as any).files.length; i++) {
      const file = (req as any).files[i];

      if (file.size > maxSize) {
        return ResponseUtil.validationError(res, 'File too large', [
          { field: `files[${i}]`, message: `File size cannot exceed ${maxSize / (1024 * 1024)}MB` }
        ]);
      }

      if (!allowedTypes.includes(file.mimetype)) {
        return ResponseUtil.validationError(res, 'Invalid file type', [
          { field: `files[${i}]`, message: `File type must be one of: ${allowedTypes.join(', ')}` }
        ]);
      }
    }
  }

  next();
};

/**
 * Validates request size and complexity to prevent DoS attacks
 */
export const validateRequestComplexity = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: {
    maxBodySize?: number;
    maxArrayLength?: number;
    maxObjectDepth?: number;
    maxStringLength?: number;
  } = {}
) => {
  const {
    maxBodySize = 10 * 1024 * 1024, // 10MB
    maxArrayLength = 1000,
    maxObjectDepth = 10,
    maxStringLength = 10000,
  } = options;

  // Check request body size
  if (req.body) {
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize > maxBodySize) {
      return ResponseUtil.validationError(res, 'Request body too large', [
        { field: 'body', message: `Request body cannot exceed ${maxBodySize / (1024 * 1024)}MB` }
      ]);
    }
  }

  // Check for excessive array lengths
  const checkArrays = (obj: any, depth = 0): boolean => {
    if (depth > maxObjectDepth) return false;

    if (Array.isArray(obj)) {
      if (obj.length > maxArrayLength) return false;
      return obj.every(item => checkArrays(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      return Object.values(obj).every(value => checkArrays(value, depth + 1));
    }

    if (typeof obj === 'string' && obj.length > maxStringLength) {
      return false;
    }

    return true;
  };

  if (req.body && !checkArrays(req.body)) {
    return ResponseUtil.validationError(res, 'Request structure too complex', [
      { field: 'body', message: 'Request contains excessively large or deeply nested data' }
    ]);
  }

  next();
};

/**
 * Validates request headers for security
 */
export const validateSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-for', // Should be handled by trust proxy
    'x-real-ip',       // Should be handled by trust proxy
    'x-client-ip',     // Should be handled by trust proxy
  ];

  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      logger.warn({
        ip: req.ip,
        header,
        value: req.headers[header],
        url: req.url,
      }, 'Suspicious header detected');
    }
  }

  // Validate Content-Type for requests with body
  if (req.body && Object.keys(req.body).length > 0) {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      logger.warn({
        ip: req.ip,
        contentType,
        url: req.url,
        method: req.method,
      }, 'Suspicious content type for request with body');
    }
  }

  next();
};

/**
 * Validates request timing to detect slow clients or DoS attempts
 */
export const validateRequestTiming = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: {
    maxRequestTime?: number;
    warnThreshold?: number;
  } = {}
) => {
  const {
    maxRequestTime = 30000, // 30 seconds
    warnThreshold = 5000,    // 5 seconds
  } = options;

  const startTime = Date.now();
  (req as any).requestStartTime = startTime;

  // Override res.end to measure response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;

    if (responseTime > warnThreshold) {
      logger.warn({
        ip: req.ip,
        url: req.url,
        method: req.method,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('User-Agent'),
      }, 'Slow request detected');
    }

    if (responseTime > maxRequestTime) {
      logger.error({
        ip: req.ip,
        url: req.url,
        method: req.method,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('User-Agent'),
      }, 'Request exceeded maximum time limit');
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Validates business rules that go beyond basic schema validation
 */
export const validateBusinessRules = (
  entityType: string,
  operation: 'create' | 'update' | 'delete',
  data: any
) => {
  const errors: Array<{ field: string; message: string }> = [];

  switch (entityType) {
    case 'sale':
      if (operation === 'create') {
        // Business rule: Total sale amount cannot exceed reasonable limits
        if (data.details) {
          const totalAmount = data.details.reduce(
            (sum: number, detail: any) => sum + (detail.quantity * (detail.price || 0)),
            0
          );

          if (totalAmount > 1000000) { // $1M limit
            errors.push({
              field: 'details',
              message: 'Total sale amount cannot exceed $1,000,000'
            });
          }
        }

        // Business rule: Cannot sell more than available stock
        if (data.details) {
          data.details.forEach((detail: any, index: number) => {
            if (detail.quantity > 99999) { // Reasonable stock limit
              errors.push({
                field: `details[${index}].quantity`,
                message: 'Quantity exceeds maximum allowed'
              });
            }
          });
        }
      }
      break;

    case 'product':
      if (operation === 'create') {
        // Business rule: Illegal products must have proper justification
        if (data.isIllegal && (!data.legalJustification || data.legalJustification.length < 10)) {
          errors.push({
            field: 'legalJustification',
            message: 'Illegal products require detailed legal justification'
          });
        }

        // Business rule: Price must be reasonable for the product type
        if (data.price && data.price > 100000) {
          errors.push({
            field: 'price',
            message: 'Price seems unreasonably high for this product'
          });
        }
      }
      break;

    case 'user':
      if (operation === 'create') {
        // Business rule: Admin users must have proper justification
        if (data.role === 'ADMIN' && (!data.adminJustification || data.adminJustification.length < 20)) {
          errors.push({
            field: 'adminJustification',
            message: 'Admin role assignment requires detailed justification'
          });
        }
      }
      break;
  }

  return errors;
};
