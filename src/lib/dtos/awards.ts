import { z } from 'zod';
import { awardStatusEnum } from '../db/schema';

export const AwardStatusSchema = z.enum(awardStatusEnum.enumValues);

export const AwardResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  parcelId: z.string().uuid(),
  assessedAmount: z.number().nullable(),
  awardDate: z.string().nullable(),
  status: AwardStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AwardListResponseSchema = z.array(AwardResponseSchema);

export const CreateAwardRequestSchema = z.object({
  parcelId: z.string().uuid(),
  assessedAmount: z.number().nonnegative().optional(),
  awardDate: z.string().optional(),
  status: AwardStatusSchema.optional(),
});

export type AwardStatus = z.infer<typeof AwardStatusSchema>;
export type AwardResponse = z.infer<typeof AwardResponseSchema>;
export type CreateAwardRequest = z.infer<typeof CreateAwardRequestSchema>;
