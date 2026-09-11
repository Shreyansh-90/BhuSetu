import { pgTable, uuid, text, date, integer, timestamp } from 'drizzle-orm/pg-core';
import { milestoneStatusEnum } from './enums';
import { projects } from './projects';
import { userProfiles } from './users';

export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  status: milestoneStatusEnum('status').notNull().default('pending'),
  dueDate: date('due_date'),
  completedDate: date('completed_date'),
  slaDays: integer('sla_days'),
  assignedTo: uuid('assigned_to').references(() => userProfiles.id),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
