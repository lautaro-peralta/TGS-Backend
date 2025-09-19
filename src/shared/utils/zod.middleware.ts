import { ZodType } from 'zod';
import { Request, Response, NextFunction } from 'express';

//Middleware para validar distintas partes del request usando Zod.

export const validarConSchema = (schemas: {
  body?: ZodType<any>;
  params?: ZodType<any>;
  query?: ZodType<any>;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errores: any[] = [];
    res.locals.validated = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errores.push(
          ...result.error.issues.map((e) => ({
            origen: 'body',
            campo: e.path.join('.'),
            mensaje: e.message,
          }))
        );
      } else {
        res.locals.validated.body = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errores.push(
          ...result.error.issues.map((e) => ({
            origen: 'params',
            campo: e.path.join('.'),
            mensaje: e.message,
          }))
        );
      } else {
        res.locals.validated.params = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errores.push(
          ...result.error.issues.map((e) => ({
            origen: 'query',
            campo: e.path.join('.'),
            mensaje: e.message,
          }))
        );
      } else {
        res.locals.validated.query = result.data;
      }
    }

    if (errores.length > 0) {
      return res.status(400).json({
        mensaje: 'Error de validación',
        errores,
      });
    }

    next();
  };
};
