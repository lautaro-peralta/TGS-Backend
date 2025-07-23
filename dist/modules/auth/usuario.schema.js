import { z } from "zod";
import { Rol } from "./usuario.entity.js";
export const usernameSchema = z
    .string()
    .min(3, "El username debe tener al menos 3 caracteres")
    .max(30, "El username no puede tener más de 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Username inválido: solo letras, números y guiones bajos");
export const crearUsuarioSchema = z.object({
    nombre: z.string().min(1, "Nombre obligatorio"),
    username: usernameSchema,
    email: z.email("Email inválido"),
    password: z.string().min(8, "Contraseña muy corta"),
    rol: z.enum(Object.values(Rol)).optional(),
});
export const cambiarRolSchema = {
    params: z.object({ id: z.uuid("ID inválido") }),
    body: z.object({
        rol: z.enum(["ADMIN", "CLIENTE", "SOCIO", "DISTRIBUIDOR"]),
    }),
};
export const identificadorSchema = z.object({
    identificador: z.string().min(1, "El identificador es requerido"),
});
//# sourceMappingURL=usuario.schema.js.map