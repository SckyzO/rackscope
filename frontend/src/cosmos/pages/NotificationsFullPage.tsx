import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Settings, Filter } from 'lucide-react';

type NotifType = 'all' | 'unread' | 'mentions' | 'tasks';

const NOTIFICATIONS = [
  {
    id: 1,
    type: 'request',
    name: 'Alex Johnson',
    initials: 'AJ',
    color: 'bg-brand-500',
    action: 'requests permission to change',
    target: 'Rackscope — Monitoring Project',
    time: '5 min ago',
    unread: true,
  },
  {
    id: 2,
    type: 'mention',
    name: 'Sarah Williams',
    initials: 'SW',
    color: 'bg-success-500',
    action: 'mentioned you in a comment on',
    target: 'Phase 7 Frontend Plan',
    time: '12 min ago',
    unread: true,
  },
  {
    id: 3,
    type: 'task',
    name: 'Michael Chen',
    initials: 'MC',
    color: 'bg-warning-500',
    action: 'assigned a new task to you:',
    target: 'Build Cosmos Theme',
    time: '1h ago',
    unread: true,
  },
  {
    id: 4,
    type: 'request',
    name: 'Emily Davis',
    initials: 'ED',
    color: 'bg-error-500',
    action: 'requests permission to change',
    target: 'Backend API Configuration',
    time: '2h ago',
    unread: false,
  },
  {
    id: 5,
    type: 'mention',
    name: 'James Wilson',
    initials: 'JW',
    color: 'bg-brand-500',
    action: 'replied to your comment on',
    target: 'expand_by_label PR review',
    time: '3h ago',
    unread: false,
  },
  {
    id: 6,
    type: 'task',
    name: 'Lisa Anderson',
    initials: 'LA',
    color: 'bg-success-500',
    action: 'completed task assigned by you:',
    target: 'CSS Design Token Migration',
    time: '5h ago',
    unread: false,
  },
  {
    id: 7,
    type: 'request',
    name: 'David Martinez',
    initials: 'DM',
    color: 'bg-warning-500',
    action: 'requests permission to change',
    target: 'Prometheus Configuration',
    time: '1d ago',
    unread: false,
  },
  {
    id: 8,
    type: 'mention',
    name: 'Jennifer Lee',
    initials: 'JL',
    color: 'bg-error-500',
    action: 'mentioned you in',
    target: 'Infrastructure Review Meeting notes',
    time: '1d ago',
    unread: false,
  },
];

const TAB_LABELS: { key: NotifType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'tasks', label: 'Tasks' },
];

const TYPE_BADGE: Record<string, string> = {
  request: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15',
  mention: 'bg-success-50 text-success-500 dark:bg-success-500/15',
  task: 'bg-warning-50 text-warning-500 dark:bg-warning-500/15',
};

export const NotificationsFullPage = () => {
  const [tab, setTab] = useState<NotifType>('all');
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [readAll, setReadAll] = useState(false);

  const visible = NOTIFICATIONS.filter((n) => {
    if (dismissed.includes(n.id)) return false;
    if (tab === 'unread') return !readAll && n.unread;
    if (tab === 'mentions') return n.type === 'mention';
    if (tab === 'tasks') return n.type === 'task';
    return true;
  });

  const unreadCount = NOTIFICATIONS.filter(
    (n) => n.unread && !readAll && !dismissed.includes(n.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button
            onClick={() => setReadAll(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1">
          {TAB_LABELS.map(({ key, label }) => {
            const count =
              key === 'unread'
                ? unreadCount
                : key === 'mentions'
                  ? NOTIFICATIONS.filter((n) => n.type === 'mention').length
                  : key === 'tasks'
                    ? NOTIFICATIONS.filter((n) => n.type === 'task').length
                    : NOTIFICATIONS.length;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab === key ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications list */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Bell className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
              No notifications
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You're all caught up. Check back later.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {visible.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${n.unread && !readAll ? 'bg-brand-25 dark:bg-brand-500/5' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${n.color}`}
                >
                  {n.initials}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold text-gray-900 dark:text-white">{n.name}</span>{' '}
                    {n.action} <span className="text-brand-500 font-medium">{n.target}</span>
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-xs text-gray-400">{n.time}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${TYPE_BADGE[n.type]}`}
                    >
                      {n.type}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {n.unread && !readAll && <span className="bg-brand-500 h-2 w-2 rounded-full" />}
                  <button
                    onClick={() => setDismissed([...dismissed, n.id])}
                    className="hover:text-error-500 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {visible.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing {visible.length} of {NOTIFICATIONS.length} notifications
              </p>
              <button className="text-brand-500 hover:text-brand-600 text-xs font-medium">
                Load more
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
