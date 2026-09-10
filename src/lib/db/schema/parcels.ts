import { pgTable, uuid, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { parcelTypeEnum } from './enums';
import { acquisitionCases } from './acquisition-cases';
import { projects } from './projects';

export const parcels = pgTable('parcels', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyNumber: text('survey_number'),
  village: text('village'),
  tehsil: text('tehsil'),
  district: text('district').notNull(),
  stateCode: text('state_code').notNull(),
  parcelType: parcelTypeEnum('parcel_type').notNull().default('private'),
  areaSqm: doublePrecision('area_sqm'),
  ownerName: text('owner_name'),
  acquisitionCaseId: uuid('acquisition_case_id').references(() => acquisitionCases.id),
  projectId: uuid('project_id').references(() => projects.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
