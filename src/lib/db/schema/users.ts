import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';
import { organizations } from './organizations';

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  organizationId: uuid('organization_id').references(() => organizations.id),
  stateCode: text('state_code'),
  districtCode: text('district_code'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
