import { Zap } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'prometheus',
  title: 'Prometheus',
  description: 'Monitoring connectivity and latency',
  group: 'Overview',
  icon: Zap,
  defaultW: 4,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
export const PrometheusWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col p-5">
    <div className="mb-4 flex items-center">
      <span
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${data.promConnected ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'}`}
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

registerWidget({ ...WIDGET_META, component: PrometheusWidget });
