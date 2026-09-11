import { z } from 'zod';

export const clarificationSchema = z.object({
  resolution: z.string().min(5).max(2000),
});

export type ClarificationDto = z.infer<typeof clarificationSchema>;
