import { z } from 'zod';
import { possessionStatusEnum } from '../db/schema';

export const PossessionStatusSchema = z.enum(possessionStatusEnum.enumValues);

export const PossessionResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  parcelId: z.string().uuid().nullable(),
  status: PossessionStatusSchema,
  possessionDate: z.string().nullable(), // date string
  remarks: z.string().nullable(),
  documents: z.array(z.string()).nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CreatePossessionRequestSchema = z.object({
  parcelId: z.string().uuid().optional(),
  status: PossessionStatusSchema.optional().default('pending'),
  possessionDate: z.string().optional(), // YYYY-MM-DD
  remarks: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

export const UpdatePossessionRequestSchema = z.object({
  status: PossessionStatusSchema.optional(),
  possessionDate: z.string().optional(),
  remarks: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

export type PossessionStatus = z.infer<typeof PossessionStatusSchema>;
export type PossessionResponse = z.infer<typeof PossessionResponseSchema>;
export type CreatePossessionRequest = z.infer<typeof CreatePossessionRequestSchema>;
export type UpdatePossessionRequest = z.infer<typeof UpdatePossessionRequestSchema>;