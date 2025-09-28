import { z } from "zod";
import { Role } from "./user.entity.js";

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username cannot be longer than 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Invalid username: only letters, numbers, and underscores are allowed");
  
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: usernameSchema,
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password is too short"),
  role: z.enum(Object.values(Role)).optional(),
});

export const changeRoleSchema = {
  params: z.object({ id: z.string().uuid("Invalid ID") }),
  body: z.object({
    role: z.enum(["ADMIN", "CLIENT", "PARTNER", "DISTRIBUTOR", "AUTHORITY"]),
  }),
};

export const identifierSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
});