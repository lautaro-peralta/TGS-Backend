import { z } from "zod";

export const crearDistribuidoraSchema = z.object({
  idDistrib: z.number().int().positive("ID debe ser un número positivo"),
  nombre: z.string().min(1, "Nombre requerido"),
  direccion: z.string().min(1, "Dirección requerida"),
  estado: z.boolean({
    required_error: "El estado es requerido",
    invalid_type_error: "El estado debe ser verdadero o falso",
  }),
  telefono: z.array(z.string().min(6, "Teléfono inválido")).nonempty("Debe tener al menos un teléfono"),
  email: z.array(z.string().email("Email inválido")).nonempty("Debe tener al menos un email"),
});

// PATCH: todos opcionales, pero si vienen, con validación básica
export const actualizarDistribuidoraSchema = z.object({
  idDistrib: z.number().int().positive().optional(), // si no permitís actualizar ID, podés quitarlo
  nombre: z.string().min(1).optional(),
  direccion: z.string().min(1).optional(),
  estado: z.boolean().optional(),
  telefono: z.array(z.string().min(6)).optional(),
  email: z.array(z.string().email()).optional(),
});
