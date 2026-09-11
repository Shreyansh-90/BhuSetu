import 'server-only';
import { db } from '../db';
import { notifications } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { NotificationResponse, CreateNotificationData } from '../dtos/notifications';

export class NotificationService {
  /**
   * Fetch all notifications for a specific user
   */
  static async getNotificationsForUser(userId: string): Promise<NotificationResponse[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
      
    return results.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  }

  /**
   * Mark a specific notification as read for a user
   */
  static async markAsRead(notificationId: string, userId: string): Promise<NotificationResponse | null> {
    const result = await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (!result || result.length === 0) {
      return null;
    }

    const updated = result[0];
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new notification (used internally by other services/workflows)
   */
  static async createNotification(data: CreateNotificationData): Promise<NotificationResponse> {
    const result = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        category: data.category,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId || null,
        isRead: false,
      })
      .returning();

    const created = result[0];
    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }
}
