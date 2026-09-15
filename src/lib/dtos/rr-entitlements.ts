import { z } from 'zod';
import { familyCategoryEnum, entitlementTypeEnum, rrStatusEnum } from '../db/schema';

export const FamilyCategorySchema = z.enum(familyCategoryEnum.enumValues);
export const EntitlementTypeSchema = z.enum(entitlementTypeEnum.enumValues);
export const RRStatusSchema = z.enum(rrStatusEnum.enumValues);

export const EntitlementResponseSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  entitlementType: EntitlementTypeSchema,
  amount: z.number().nullable(),
  description: z.string().nullable(),
  status: RRStatusSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const FamilyResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  parcelId: z.string().uuid().nullable(),
  headOfFamilyName: z.string(),
  familySize: z.number(),
  category: FamilyCategorySchema,
  status: RRStatusSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  entitlements: z.array(EntitlementResponseSchema).optional(),
});

export const CreateFamilyRequestSchema = z.object({
  parcelId: z.string().uuid().optional(),
  headOfFamilyName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  familySize: z.number().int().min(1, { message: 'Family size must be at least 1.' }),
  category: FamilyCategorySchema,
});

export const CreateEntitlementRequestSchema = z.object({
  entitlementType: EntitlementTypeSchema,
  amount: z.number().nonnegative().optional(),
  description: z.string().optional(),
});

export const UpdateEntitlementRequestSchema = z.object({
  status: RRStatusSchema,
});

export type FamilyCategory = z.infer<typeof FamilyCategorySchema>;
export type EntitlementType = z.infer<typeof EntitlementTypeSchema>;
export type RRStatus = z.infer<typeof RRStatusSchema>;
export type FamilyResponse = z.infer<typeof FamilyResponseSchema>;
export type EntitlementResponse = z.infer<typeof EntitlementResponseSchema>;
export type CreateFamilyRequest = z.infer<typeof CreateFamilyRequestSchema>;
export type CreateEntitlementRequest = z.infer<typeof CreateEntitlementRequestSchema>;
export type UpdateEntitlementRequest = z.infer<typeof UpdateEntitlementRequestSchema>;