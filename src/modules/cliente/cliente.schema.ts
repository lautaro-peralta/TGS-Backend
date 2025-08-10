import { z } from "zod";
import { crearUsuarioSchema } from "../auth/usuario.schema.js";
export const crearClienteSchema = z.object({
  dni: z.string().min(1, "DNI requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  email: z.email("Email inválido"),
  direccion: z.string().min(1),
  telefono: z.string().min(6)
});

// PATCH: todos opcionales, pero si vienen, con validación básica
export const actualizarClienteSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").optional(),
  email: z.email("Email inválido").optional(),
  direccion: z.string().min(1).optional(),
  telefono: z.string().min(6).optional()
});