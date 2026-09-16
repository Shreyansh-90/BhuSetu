import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { userProfiles } from './users';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message'),
  type: text('type').notNull().default('info'), // 'info', 'task_assigned', 'status_change', 'system'
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
