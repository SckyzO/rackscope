import { Zap } from 'lucide-react';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const PrometheusWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-4 flex items-center gap-2">
      <Zap className="h-4 w-4 text-amber-500" />
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prometheus</h2>
      <span
        className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${data.promConnected ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${data.promConnected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}
        />
        {data.promConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
    {data.promStats ? (
      <div className="space-y-2">
        {[
          {
            label: 'Last latency',
            value: data.promStats.last_ms ? `${Math.round(data.promStats.last_ms)} ms` : '—',
          },
          {
            label: 'Avg latency',
            value: data.promStats.avg_ms ? `${Math.round(data.promStats.avg_ms)} ms` : '—',
          },
          {
            label: 'Next scrape',
            value: data.promNextSec > 0 ? `${data.promNextSec}s` : 'now',
          },
          {
            label: 'Heartbeat',
            value: data.promStats.heartbeat_seconds ? `${data.promStats.heartbeat_seconds}s` : '—',
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{value}</span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-gray-400">Checking connection...</p>
    )}
  </div>
);

registerWidget({
  type: 'prometheus',
  title: 'Prometheus',
  description: 'Monitoring connectivity and latency',
  defaultW: 4,
  defaultH: 2,
  icon: Zap,
  group: 'Overview',
  component: PrometheusWidget,
});
