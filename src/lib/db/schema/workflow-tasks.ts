import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { workflowTaskStatusEnum } from './enums';
import { projects } from './projects';
import { milestones } from './milestones';
import { userProfiles } from './users';

export const workflowTasks = pgTable('workflow_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  milestoneId: uuid('milestone_id').references(() => milestones.id),
  title: text('title').notNull(),
  description: text('description'),
  status: workflowTaskStatusEnum('status').notNull().default('pending'),
  assignedTo: uuid('assigned_to').references(() => userProfiles.id),
  assignedBy: uuid('assigned_by').references(() => userProfiles.id),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
