import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  category: z.enum(['normal', 'urgent']).default('normal'),
  purpose: z.string().min(5).max(1000),
  stateCode: z.string().length(2),
  districtCode: z.string().length(3),
  requestingOrgId: z.string().uuid(),
  acquiringOrgId: z.string().uuid().optional(),
  estimatedAreaSqm: z.number().positive().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum([
    'draft', 'submitted', 'under_scrutiny', 'clarification_requested',
    'approved', 'rejected', 'notification_issued', 'award_declared',
    'compensation_assessed', 'possession_taken', 'closed', 'archived'
  ]).optional(),
  stateCode: z.string().length(2).optional(),
  districtCode: z.string().length(3).optional(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type ProjectQueryDto = z.infer<typeof projectQuerySchema>;
