import { z } from 'zod';
import { notificationCategoryEnum } from '../db/schema';

export const NotificationCategorySchema = z.enum(notificationCategoryEnum.enumValues);

export const NotificationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  category: NotificationCategorySchema,
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  referenceId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const NotificationListResponseSchema = z.array(NotificationResponseSchema);

export const CreateNotificationDataSchema = z.object({
  userId: z.string().uuid(),
  category: NotificationCategorySchema,
  title: z.string(),
  message: z.string(),
  referenceId: z.string().uuid().optional(),
});

export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type CreateNotificationData = z.infer<typeof CreateNotificationDataSchema>;
