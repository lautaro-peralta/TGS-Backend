import { z } from "zod";

// Schema for creating a product
export const createProductSchema = z.object({
  price: z.number().positive("The price must be a positive number"),
  stock: z.number().int().nonnegative("The stock cannot be negative"),
  description: z.string()
    .trim()
    .min(3, "The description must be at least 3 characters long")
    .max(200, "The description cannot exceed 200 characters")
    .refine((v) => /\S/.test(v), "The description cannot be empty"),
  isIllegal: z.boolean().optional().default(false),
});

// Schema for updating a product (all optional)
export const updateProductSchema = z.object({
  price: z.number().positive("The price must be a positive number").optional(),
  stock: z.number().int().nonnegative("The stock cannot be negative").optional(),
  description: z.string()
    .trim()
    .min(3, "The description must be at least 3 characters long")
    .max(200, "The description cannot exceed 200 characters")
    .refine((v) => /\S/.test(v), "The description cannot be empty")
    .optional(),
  isIllegal: z.boolean().optional(),
});
