// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodType } from 'zod';
import { ResponseUtil } from '../utils/response.util.js';

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
