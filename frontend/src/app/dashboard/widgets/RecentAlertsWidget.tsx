import { AlertTriangle } from 'lucide-react';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const RecentAlertsWidget = ({ data }: { data: DashboardData }) => {
  const top3 = data.alerts.filter((a) => a.state === 'CRIT').slice(0, 3);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-2 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Recent CRIT
      </p>
      {top3.length === 0 ? (
        <p className="text-xs text-green-500">No CRIT alerts</p>
      ) : (
        <div className="space-y-2">
          {top3.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="truncate font-mono text-gray-800 dark:text-gray-200">
                {a.node_id}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

registerWidget({
  type: 'recent-alerts',
  title: 'Recent CRIT',
  description: 'Last 3 critical alerts',
  defaultW: 4,
  defaultH: 2,
  icon: AlertTriangle,
  group: 'Monitoring',
  component: RecentAlertsWidget,
});
