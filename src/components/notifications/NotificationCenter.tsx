'use client';

import { useState } from 'react';

import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCheck,
  AlertCircle,
  InboxIcon,
  RefreshCw,
  Milestone,
  GitBranch,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationResponse, NotificationCategory } from '@/lib/dtos/notifications';
import { cn } from '@/lib/utils';

// ─── Category Config ───────────────────────────────────────────────────────

type CategoryConfig = {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
  dotClass: string;
};

const CATEGORY_CONFIG: Record<NotificationCategory, CategoryConfig> = {
  milestone: {
    label: 'Milestone',
    icon: Milestone,
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  workflow: {
    label: 'Workflow',
    icon: GitBranch,
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    dotClass: 'bg-purple-500',
  },
  alert: {
    label: 'Alert',
    icon: AlertCircle,
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  general: {
    label: 'General',
    icon: Bell,
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    dotClass: 'bg-slate-400',
  },
};

// ─── Notification Row ───────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onRead,
  index,
}: {
  notification: NotificationResponse;
  onRead: (id: string) => void;
  index: number;
}) {
  const config = CATEGORY_CONFIG[notification.category] ?? CATEGORY_CONFIG.general;
  const CategoryIcon = config.icon;

  const handleClick = () => {
    if (!notification.isRead) onRead(notification.id);
  };

  const inner = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onClick={handleClick}
      className={cn(
        'flex gap-4 px-5 py-4 border-b last:border-0 cursor-pointer transition-colors hover:bg-accent/40 group',
        !notification.isRead && 'bg-primary/[0.03]'
      )}
      aria-label={`${notification.isRead ? '' : 'Unread: '}${notification.title}`}
    >
      {/* Icon */}
      <div
        className={cn(
          'mt-0.5 h-9 w-9 shrink-0 rounded-lg flex items-center justify-center',
          config.badgeClass
        )}
        aria-hidden="true"
      >
        <CategoryIcon className="h-4 w-4" />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-snug',
              notification.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground'
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span
              className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0 flex-none', config.dotClass)}
              aria-label="Unread"
            />
          )}
        </div>

        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {notification.message}
        </p>

        <div className="flex items-center gap-3 mt-2">
          <Badge
            variant="outline"
            className={cn('text-xs px-1.5 py-0 h-5 font-normal capitalize', config.badgeClass, 'border-0')}
          >
            {config.label}
          </Badge>
          <time
            dateTime={notification.createdAt}
            className="text-xs text-muted-foreground/70"
            title={format(new Date(notification.createdAt), 'PPpp')}
          >
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </time>
        </div>
      </div>
    </motion.div>
  );

  if (notification.referenceId) {
    return (
      <Link href={`/workspace/projects/${notification.referenceId}`} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex gap-4 px-5 py-4 border-b last:border-0">
      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ─── Filter Tabs ─────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'document', label: 'Documents' },
  { value: 'award', label: 'Awards' },
  { value: 'payment', label: 'Payments' },
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]['value'];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function NotificationCenterPage() {
  const { notifications, isLoading, error, unreadCount, markAsRead, markAllAsRead, refresh } =
    useNotifications();

  const [filter, setFilter] = useSafeState<FilterValue>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.category === filter;
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
              : 'All notifications read.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-none" role="tablist" aria-label="Filter notifications">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            role="tab"
            aria-selected={filter === opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'shrink-0 px-3 py-1.5 text-sm rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              filter === opt.value
                ? 'bg-foreground text-background border-foreground'
                : 'text-muted-foreground border-border hover:bg-accent/60'
            )}
          >
            {opt.label}
            {opt.value === 'unread' && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="rounded-xl border overflow-hidden bg-background">
        {isLoading ? (
          <>
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-destructive/50" />
            <p className="font-medium">Could not load notifications</p>
            <Button variant="outline" size="sm" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 py-16 text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <InboxIcon className="h-12 w-12 opacity-20" />
            <p className="font-medium">
              {filter === 'unread' ? 'No unread notifications' : "You're all caught up!"}
            </p>
            <p className="text-sm">
              {filter === 'unread'
                ? 'All notifications have been read.'
                : 'New notifications will appear here.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((notification, i) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                index={i}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* aria-live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All notifications read'}
      </div>
    </div>
  );
}

// ─── Tiny helper to avoid "use client" restrictions on useState ──────────────
function useSafeState<T>(initial: T): [T, (v: T) => void] {
  const [state, setState] = useState(initial);
  return [state, setState];
}

