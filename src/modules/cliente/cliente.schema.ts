import { z } from "zod";

export const crearClienteSchema = z.object({
  dni: z.string().min(1, "DNI requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  email: z.email("Email inválido"),
  direccion: z.string().min(1),
  telefono: z.string().min(6),
});

// PATCH: todos opcionales, pero si vienen, con validación básica
export const actualizarClienteSchema = z.object({
  dni: z.string().optional(), // normalmente no permitimos cambiar dni, podríamos eliminar esto si no se puede
  nombre: z.string().min(1).optional(),
  email: z.email().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
});