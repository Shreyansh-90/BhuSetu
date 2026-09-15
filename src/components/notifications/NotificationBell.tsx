'use client';

import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Loader2, AlertCircle, InboxIcon } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationResponse } from '@/lib/dtos/notifications';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  milestone: 'bg-blue-500',
  workflow: 'bg-purple-500',
  alert: 'bg-red-500',
  general: 'bg-slate-400',
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationResponse;
  onRead: (id: string) => void;
}) {
  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id);
    }
  };

  const content = (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={cn(
        'flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50 border-b last:border-0',
        !notification.isRead && 'bg-primary/5'
      )}
    >
      {/* Category dot */}
      <div className="mt-1 shrink-0">
        <span
          className={cn(
            'block w-2 h-2 rounded-full mt-0.5',
            CATEGORY_COLORS[notification.category] ?? 'bg-slate-400',
            notification.isRead && 'opacity-40'
          )}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug truncate',
            notification.isRead ? 'text-muted-foreground' : 'font-medium text-foreground'
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {!notification.isRead && (
        <span className="sr-only">Unread notification</span>
      )}
    </motion.div>
  );

  if (notification.referenceId) {
    return (
      <Link href={`/workspace/projects/${notification.referenceId}`} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

export function NotificationBell() {
  const { notifications, isLoading, error, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const recent = notifications.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="h-4 w-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-30" />
              <Badge
                variant="destructive"
                className="h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </motion.span>
          )}
        </AnimatePresence>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[380px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-2 w-2 rounded-full mt-1 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive/60" />
              <p className="text-xs">Failed to load notifications</p>
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <InboxIcon className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">You&apos;re all caught up!</p>
              <p className="text-xs">No notifications yet.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {recent.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {!isLoading && notifications.length > 0 && (
          <div className="border-t px-4 py-2.5">
            <Link
              href="/workspace/notifications"
              className="block text-center text-xs text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
