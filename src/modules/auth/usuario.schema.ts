import { z } from "zod";

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, "Nombre obligatorio"),
  email: z.email("Email inválido"),
  password: z.string().min(8, "Contraseña muy corta"),
});

export const cambiarRolSchema = {
  params: z.object({ id: z.string().uuid("ID inválido") }),
  body: z.object({
    rol: z.enum(["ADMIN", "CLIENTE", "SOCIO", "DISTRIBUIDOR"]),
  }),
};
export const usernameSchema = z.object({
  username: z
    .string()
    .min(3, "El username debe tener al menos 3 caracteres")
    .max(30, "El username no puede tener más de 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Username inválido: solo letras, números y guiones bajos"),
});

export const identificadorSchema = z.object({
  identificador: z.string().min(1, "El identificador es requerido"),
});