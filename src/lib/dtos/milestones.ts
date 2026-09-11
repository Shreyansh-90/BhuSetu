import { z } from 'zod';
import { milestoneStatusEnum } from '../db/schema';

export const milestoneStatusSchema = z.enum(milestoneStatusEnum.enumValues);

export const createMilestoneDto = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  slaDays: z.number().int().positive().optional(),
  assignedTo: z.string().uuid().optional(),
  sortOrder: z.number().int().optional().default(0),
});

export const updateMilestoneDto = z.object({
  status: milestoneStatusSchema.optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }).optional(),
  completedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }).optional(),
  slaDays: z.number().int().positive().optional(),
  assignedTo: z.string().uuid().optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateMilestoneDto = z.infer<typeof createMilestoneDto>;
export type UpdateMilestoneDto = z.infer<typeof updateMilestoneDto>;
