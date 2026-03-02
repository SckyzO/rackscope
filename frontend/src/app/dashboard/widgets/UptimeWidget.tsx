import { Zap } from 'lucide-react';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const UptimeWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <Zap className="h-6 w-6 text-amber-500" />
    <p className="text-2xl font-bold text-gray-900 dark:text-white">
      {data.promStats?.last_ms ? `${Math.round(data.promStats.last_ms)} ms` : '—'}
    </p>
    <p className="text-xs text-gray-400">Last scrape latency</p>
  </div>
);

registerWidget({
  type: 'uptime',
  title: 'Scrape Latency',
  description: 'Last Prometheus scrape latency',
  defaultW: 3,
  defaultH: 2,
  icon: Zap,
  group: 'Stats',
  component: UptimeWidget,
});
