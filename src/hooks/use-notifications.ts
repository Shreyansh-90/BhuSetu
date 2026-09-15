'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationResponse } from '@/lib/dtos/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const json = await res.json();
      setNotifications(json.data ?? []);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      const res = await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) {
        // Revert on failure
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
        );
      }
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.allSettled(
      unread.map((n) => fetch(`/api/v1/notifications/${n.id}/read`, { method: 'PATCH' }))
    );
  }, [notifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
