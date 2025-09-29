import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
export const crearSocioSchema = z.object({
  dni: z.string().min(1, 'DNI requerido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
});

export const patchSocioSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
});

export type CrearSocioBody = z.infer<typeof crearSocioSchema>;
export type PatchSocioBody = z.infer<typeof patchSocioSchema>;


declare global {
  namespace Express {
    interface Locals {
      validated?: { body: CrearSocioBody | PatchSocioBody };
    }
  }
}

export function validarCrearSocio(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const parsed = crearSocioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.flatten() });
    return;
  }
  res.locals.validated = { body: parsed.data };
  next();
}

export function validarPatchSocio(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const parsed = patchSocioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.flatten() });
    return;
  }
  res.locals.validated = { body: parsed.data };
  next();
}
