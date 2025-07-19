import { z } from "zod";

export const registroSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  email: z.email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});