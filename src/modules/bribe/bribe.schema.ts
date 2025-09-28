import { z } from 'zod';

export const updateBribeSchema = z.object({
  amount: z
    .number()
    .nonnegative({ message: 'The amount must be zero or positive' }),
});

export const payBribesSchema = z.object({
  ids: z.union([
    z.number().int().positive(),
    z.array(z.number().int().positive()).min(1),
  ]),
});

export type UpdateBribeInput = z.infer<typeof updateBribeSchema>;
export type payBribeInput = z.infer<typeof payBribesSchema>;
