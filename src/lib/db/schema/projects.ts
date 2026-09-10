import { pgTable, uuid, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { projectStatusEnum, acquisitionCategoryEnum } from './enums';
import { organizations } from './organizations';
import { userProfiles } from './users';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('draft'),
  category: acquisitionCategoryEnum('category').notNull().default('normal'),
  purpose: text('purpose'),
  stateCode: text('state_code').notNull(),
  districtCode: text('district_code').notNull(),
  requestingOrgId: uuid('requesting_org_id').notNull().references(() => organizations.id),
  acquiringOrgId: uuid('acquiring_org_id').references(() => organizations.id),
  createdBy: uuid('created_by').notNull().references(() => userProfiles.id),
  estimatedAreaSqm: doublePrecision('estimated_area_sqm'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
