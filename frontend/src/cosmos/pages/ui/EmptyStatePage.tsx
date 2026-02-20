import { Search, Database, Bell, AlertTriangle, Wifi, Plus, RefreshCw } from 'lucide-react';

const SectionCard = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

const EmptyState = ({
  icon: Icon,
  iconBg,
  title,
  desc,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: string;
  desc: string;
  action?: { label: string; icon?: React.ComponentType<{ className?: string }>; variant?: string };
}) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${iconBg}`}>
      <Icon className="h-7 w-7 text-gray-500 dark:text-gray-400" />
    </div>
    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
    <p className="mt-1.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">{desc}</p>
    {action && (
      <button
        className={`mt-5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${action.variant === 'ghost' ? 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300' : 'bg-brand-500 hover:bg-brand-600 text-white'}`}
      >
        {action.icon && <action.icon className="h-4 w-4" />}
        {action.label}
      </button>
    )}
  </div>
);

export const EmptyStatePage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Empty State</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Placeholder UI for empty content areas
      </p>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="No Results" desc="Search returned no matches">
        <EmptyState
          icon={Search}
          iconBg="bg-gray-100 dark:bg-gray-800"
          title="No results found"
          desc="Try adjusting your search terms or filters to find what you're looking for."
        />
      </SectionCard>
      <SectionCard title="No Data" desc="Empty collection with CTA">
        <EmptyState
          icon={Database}
          iconBg="bg-brand-50 dark:bg-brand-500/10"
          title="No data yet"
          desc="Get started by adding your first item to the collection."
          action={{ label: 'Add Item', icon: Plus }}
        />
      </SectionCard>
      <SectionCard title="All Caught Up" desc="No notifications">
        <EmptyState
          icon={Bell}
          iconBg="bg-success-50 dark:bg-success-500/10"
          title="You're all caught up!"
          desc="No new notifications. Check back later for updates."
        />
      </SectionCard>
      <SectionCard title="Error State" desc="Something went wrong">
        <EmptyState
          icon={AlertTriangle}
          iconBg="bg-error-50 dark:bg-error-500/10"
          title="Something went wrong"
          desc="An unexpected error occurred. Please try again or contact support."
          action={{ label: 'Try Again', icon: RefreshCw, variant: 'ghost' }}
        />
      </SectionCard>
      <SectionCard title="No Connection" desc="Network unavailable">
        <EmptyState
          icon={Wifi}
          iconBg="bg-warning-50 dark:bg-warning-500/10"
          title="No internet connection"
          desc="Check your network settings and try reconnecting."
          action={{ label: 'Retry Connection', icon: RefreshCw, variant: 'ghost' }}
        />
      </SectionCard>
      <SectionCard title="No Alerts (Rackscope)" desc="Infrastructure is healthy">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="bg-success-50 dark:bg-success-500/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <Bell className="text-success-500 h-7 w-7" />
          </div>
          <h3 className="text-success-600 dark:text-success-400 text-base font-semibold">
            All systems healthy
          </h3>
          <p className="mt-1.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">
            No active alerts. All racks and devices are operating normally.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
            <span className="bg-success-500 h-2 w-2 animate-pulse rounded-full" />
            Last checked 30s ago
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
);
