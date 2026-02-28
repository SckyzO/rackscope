import { CheckCircle, Info, AlertTriangle, XCircle, X, Bell } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const toasts = [
  {
    type: 'success',
    icon: CheckCircle,
    title: 'Action completed',
    msg: 'Your changes have been saved successfully.',
    bg: 'bg-success-50 dark:bg-success-500/10',
    border: 'border-success-200 dark:border-success-500/30',
    icon_c: 'text-success-500',
  },
  {
    type: 'info',
    icon: Info,
    title: 'New information',
    msg: 'Check out the latest updates to your dashboard.',
    bg: 'bg-brand-50 dark:bg-brand-500/10',
    border: 'border-brand-200 dark:border-brand-500/30',
    icon_c: 'text-brand-500',
  },
  {
    type: 'warning',
    icon: AlertTriangle,
    title: 'Double check required',
    msg: 'Please review your information before submitting.',
    bg: 'bg-warning-50 dark:bg-warning-500/10',
    border: 'border-warning-200 dark:border-warning-500/30',
    icon_c: 'text-warning-500',
  },
  {
    type: 'error',
    icon: XCircle,
    title: 'Something went wrong',
    msg: 'An error occurred while processing your request.',
    bg: 'bg-error-50 dark:bg-error-500/10',
    border: 'border-error-200 dark:border-error-500/30',
    icon_c: 'text-error-500',
  },
];

export const NotificationsPage = () => {
  usePageTitle('Notifications');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Feedback messages and notification patterns"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'UI Library', href: '/ui' },
              { label: 'Notifications' },
            ]}
          />
        }
      />
      <div className="grid gap-6">
        <SectionCard title="Announcement Bar" desc="Full-width top notification banner">
          <div className="flex flex-col gap-3">
            <div className="bg-brand-50 dark:bg-brand-500/15 flex items-center justify-between rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                🎉 New update available! Check out the latest features.
              </p>
              <div className="flex gap-2">
                <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white dark:text-gray-300">
                  Later
                </button>
                <button className="bg-brand-500 hover:bg-brand-600 rounded-lg px-3 py-1.5 text-sm font-medium text-white">
                  Update Now
                </button>
              </div>
            </div>
            <div className="bg-warning-50 dark:bg-warning-500/15 flex items-center justify-between rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                ⚠️ Your subscription expires in 3 days.
              </p>
              <button className="bg-warning-500 hover:bg-warning-600 rounded-lg px-3 py-1.5 text-sm font-medium text-white">
                Renew Now
              </button>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Toast Notifications" desc="Contextual status messages with icons">
          <div className="space-y-3">
            {toasts.map((t) => (
              <div
                key={t.type}
                className={`flex items-start gap-3 rounded-xl border p-4 ${t.bg} ${t.border}`}
              >
                <t.icon className={`h-5 w-5 shrink-0 ${t.icon_c}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{t.msg}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Notification Feed" desc="Bell dropdown with notification list">
          <div className="shadow-theme-lg w-80 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">Notifications</span>
              </div>
              <span className="bg-brand-500 rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
                5
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { name: 'Alex J.', msg: 'commented on your post', time: '5m ago' },
                { name: 'Sarah W.', msg: 'sent you a friend request', time: '12m ago' },
                { name: 'Mike C.', msg: 'shared a file with you', time: '1h ago' },
                { name: 'Emily D.', msg: 'mentioned you in a comment', time: '2h ago' },
                { name: 'James W.', msg: 'reacted to your photo', time: '3h ago' },
              ].map((n, i) => (
                <div key={i} className="flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {n.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-gray-900 dark:text-white">{n.name}</span>{' '}
                      {n.msg}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{n.time}</p>
                  </div>
                  <span className="bg-brand-500 mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2 dark:border-gray-800">
              <button className="text-brand-500 w-full rounded-lg py-2 text-center text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5">
                View all notifications
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
