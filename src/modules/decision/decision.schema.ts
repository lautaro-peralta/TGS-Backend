import { z } from 'zod';

const today = new Date();
today.setHours(0, 0, 0, 0);

export const createDecisionSchema = z
  .object({
    themeId: z.number().int().positive(),
    description: z
      .string()
      .min(1, 'Strategic decision description is required'),
    startDate: z.coerce.date().refine((date) => date >= today, {
      message: 'The date must be greater than or equal to today',
    }),
    endDate: z.coerce.date(),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: 'The end date must be greater than or equal to the start date',
      path: ['endDate'],
    }
  );

export const updateDecisionSchema = createDecisionSchema.partial();
