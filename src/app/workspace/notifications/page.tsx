'use client';

import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Loader2, AlertCircle, InboxIcon } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { NotificationResponse } from '@/lib/dtos/notifications';

const CATEGORY_COLORS: Record<string, string> = {
  milestone: 'bg-blue-500',
  workflow: 'bg-purple-500',
  alert: 'bg-red-500',
  general: 'bg-slate-400',
};

export default function NotificationsPage() {
  const { notifications, isLoading, error, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground max-w-2xl">
            View all your alerts, workflow updates, and milestone reminders.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-lg">Inbox</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-3 w-3 rounded-full mt-1 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
             <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
               <AlertCircle className="h-8 w-8 text-destructive/60" />
               <p className="text-sm">Failed to load notifications.</p>
             </div>
          ) : notifications.length === 0 ? (
             <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
               <InboxIcon className="h-12 w-12 opacity-20" />
               <p className="text-lg font-medium mt-4">You're all caught up!</p>
               <p className="text-sm">No notifications found.</p>
             </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "flex flex-col sm:flex-row gap-4 p-6 transition-colors hover:bg-accent/30",
                    !n.isRead && "bg-primary/5"
                  )}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div className="mt-1 shrink-0">
                    <span
                      className={cn(
                        'block w-3 h-3 rounded-full',
                        CATEGORY_COLORS[n.category] ?? 'bg-slate-400',
                        n.isRead && 'opacity-40'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={cn(
                        "text-base leading-snug", 
                        n.isRead ? "text-muted-foreground" : "font-medium text-foreground"
                      )}>
                        {n.title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{n.message}</p>
                    {n.referenceId && (
                      <Link href={`/workspace/projects/${n.referenceId}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          View Project
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
