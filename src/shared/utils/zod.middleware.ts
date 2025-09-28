import { ZodType } from 'zod';
import { Request, Response, NextFunction } from 'express';

//Middleware to validate different parts of the request using Zod.

export const validateWithSchema = (schemas: {
  body?: ZodType<any>;
  params?: ZodType<any>;
  query?: ZodType<any>;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = [];
    res.locals.validated = {};

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

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation error',
        errors,
      });
    }

    next();
  };
};
