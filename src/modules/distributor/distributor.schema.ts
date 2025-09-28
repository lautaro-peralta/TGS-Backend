import { z } from "zod";

export const createDistributorSchema = z.object({
  dni: z.string().min(1, "DNI is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(6, "Invalid phone"),
  email: z.string().email("Invalid email"),
  // optionally receive product ids to associate
  productsIds: z.array(z.number().int().positive()).optional()
});

// PATCH: all optional, but if they come, with basic validation
export const updateDistributorSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  address: z.string().min(1, "Address is required").optional(),
  phone: z.string().min(6, "Invalid phone").optional(),
  email: z.string().email("Invalid email").optional(),
  productsIds: z.array(z.number().int().positive()).optional()
});
