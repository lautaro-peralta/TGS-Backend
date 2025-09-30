// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { ZodType } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Creates a middleware that validates different parts of the request using Zod schemas
 *
 * Validates:
 * - Request body (req.body)
 * - Route parameters (req.params)
 * - Query string (req.query)
 *
 * Validated data is stored in res.locals.validated for type-safe access
 *
 * @param schemas - Object containing Zod schemas for different request parts
 * @returns Express middleware function
 *
 * @example
 * router.post('/users',
 *   validateWithSchema({
 *     body: z.object({ name: z.string(), email: z.string().email() }),
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
