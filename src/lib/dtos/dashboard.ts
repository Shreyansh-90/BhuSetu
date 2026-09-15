import { z } from 'zod';

export const ProjectKpiResponseSchema = z.object({
  totalParcels: z.number().int().nonnegative(),
  totalAreaAcquired: z.number().nonnegative(),
  totalCompensationAssessed: z.number().nonnegative(),
  totalCompensationPaid: z.number().nonnegative(),
  totalAffectedFamilies: z.number().int().nonnegative(),
  familiesRehabilitated: z.number().int().nonnegative(),
  possessionStatus: z.string(), // e.g. "0/10 Parcels Acquired" or "Handed Over"
  lastCalculatedAt: z.string().datetime(), // ISO string for freshness
});

export const AuditExportRequestSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

export type ProjectKpiResponse = z.infer<typeof ProjectKpiResponseSchema>;
export type AuditExportRequest = z.infer<typeof AuditExportRequestSchema>;