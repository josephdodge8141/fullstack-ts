import { z } from 'zod';

export const errorDetailSchema = z.strictObject({
  path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
  message: z.string().trim().min(1),
  code: z.string().trim().min(1),
});

export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.string().trim().min(1),
    message: z.string().trim().min(1),
    details: z.array(errorDetailSchema).optional(),
  }),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
