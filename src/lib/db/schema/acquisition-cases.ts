import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { projectStatusEnum } from './enums';
import { projects } from './projects';
import { organizations } from './organizations';

export const acquisitionCases = pgTable('acquisition_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  caseReference: text('case_reference'),
  applicableLegalProcess: text('applicable_legal_process'),
  stateCode: text('state_code').notNull(),
  authorityOrgId: uuid('authority_org_id').references(() => organizations.id),
  status: projectStatusEnum('status').notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
