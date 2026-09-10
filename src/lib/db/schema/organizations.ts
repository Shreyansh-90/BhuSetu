import { pgTable, uuid, text, boolean, timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { organizationTypeEnum } from './enums';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  orgType: organizationTypeEnum('org_type').notNull(),
  stateCode: text('state_code'),
  districtCode: text('district_code'),
  parentOrgId: uuid('parent_org_id').references((): AnyPgColumn => organizations.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
