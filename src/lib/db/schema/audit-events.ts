import { pgTable, uuid, text, jsonb, inet, timestamp } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';
import { userProfiles } from './users';

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  actorId: uuid('actor_id').references(() => userProfiles.id),
  actorRole: userRoleEnum('actor_role'),
  actorIp: inet('actor_ip'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // No updatedAt — audit events are immutable
});
