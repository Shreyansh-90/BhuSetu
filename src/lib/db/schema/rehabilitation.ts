import { pgTable, uuid, text, boolean, timestamp, doublePrecision } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { parcels } from './parcels';

export const rehabilitation = pgTable('rehabilitation', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  parcelId: uuid('parcel_id').references(() => parcels.id).notNull(),
  familyHeadName: text('family_head_name').notNull(),
  category: text('category').notNull(), // 'landowner', 'tenant', 'laborer'
  housingProvided: boolean('housing_provided').default(false),
  employmentProvided: boolean('employment_provided').default(false),
  annuityProvided: boolean('annuity_provided').default(false),
  oneTimeAllowanceAmount: doublePrecision('one_time_allowance_amount'),
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'disbursed'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
