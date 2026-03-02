import { XCircle } from 'lucide-react';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const AlertCountWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-baseline gap-3">
      <span className="text-5xl font-black text-red-500">{data.critCount}</span>
      <span className="text-2xl font-bold text-amber-500">+{data.warnCount}</span>
    </div>
    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Active Alerts</p>
  </div>
);

registerWidget({
  type: 'alert-count',
  title: 'Alert Count',
  description: 'CRIT + WARN count prominent display',
  defaultW: 3,
  defaultH: 2,
  icon: XCircle,
  group: 'Stats',
  component: AlertCountWidget,
});
