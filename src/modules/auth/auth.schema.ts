import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email('El email debe ser válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial'
    ),
  username: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100),
});

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
