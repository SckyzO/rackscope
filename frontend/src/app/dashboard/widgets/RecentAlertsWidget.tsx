import { AlertTriangle } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'recent-alerts',
  title: 'Recent CRIT',
  description: 'Last 3 critical alerts',
  group: 'Monitoring',
  icon: AlertTriangle,
  defaultW: 4,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
export const RecentAlertsWidget = ({ data }: { data: DashboardData }) => {
  const top3 = data.alerts.filter((a) => a.state === 'CRIT').slice(0, 3);
  return (
    <div className="flex h-full flex-col p-4">
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

registerWidget({ ...WIDGET_META, component: RecentAlertsWidget });
