import { z } from 'zod';
import { paymentStatusEnum } from '../db/schema';

export const PaymentStatusSchema = z.enum(paymentStatusEnum.enumValues);

export const PaymentReconciliationResponseSchema = z.object({
  id: z.string().uuid().optional(),
  awardId: z.string().uuid(),
  projectId: z.string().uuid(),
  assessedAmount: z.number().nullable(),
  paidAmount: z.number().nullable(),
  externalReference: z.string().nullable(),
  paymentStatus: PaymentStatusSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const PaymentReconciliationListResponseSchema = z.array(PaymentReconciliationResponseSchema);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentReconciliationResponse = z.infer<typeof PaymentReconciliationResponseSchema>;
