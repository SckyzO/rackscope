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

// ── Latency color thresholds ──────────────────────────────────────────────
const latencyColor = (ms: number | undefined): string => {
  if (!ms) return 'text-gray-400 dark:text-gray-500';
  if (ms < 100) return 'text-emerald-500 dark:text-emerald-400';
  if (ms < 500) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
};

// ── Stat row ──────────────────────────────────────────────────────────────
const Stat = ({
  label,
  value,
  valueClass = 'text-gray-800 dark:text-gray-200',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px] text-gray-400 dark:text-gray-500">{label}</span>
    <span className={`font-mono text-xs font-medium tabular-nums ${valueClass}`}>{value}</span>
  </div>
);

// ── Component ──────────────────────────────────────────────────────────────
export const PrometheusWidget = ({ data }: { data: DashboardData }) => {
  const { promConnected, promStats, promNextSec } = data;

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Connection badge */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0">
          {promConnected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              promConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
        </span>
        <span
          className={`text-xs font-semibold ${
            promConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {promConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Stats */}
      {promStats ? (
        <div className="flex flex-col gap-1.5">
          <Stat
            label="Last latency"
            value={promStats.last_ms ? `${Math.round(promStats.last_ms)} ms` : '—'}
            valueClass={latencyColor(promStats.last_ms)}
          />
          <Stat
            label="Avg latency"
            value={promStats.avg_ms ? `${Math.round(promStats.avg_ms)} ms` : '—'}
            valueClass={latencyColor(promStats.avg_ms)}
          />
          <Stat
            label="Next scrape"
            value={promNextSec > 0 ? `${promNextSec}s` : 'now'}
          />
          {promStats.heartbeat_seconds && (
            <Stat
              label="Heartbeat"
              value={`${promStats.heartbeat_seconds}s`}
            />
          )}
          {promStats.query_count !== undefined && (
            <Stat
              label="Queries"
              value={String(promStats.query_count)}
            />
          )}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {promConnected ? 'Fetching stats…' : 'Prometheus unreachable'}
        </p>
      )}
    </div>
  );
};

registerWidget({ ...WIDGET_META, component: PrometheusWidget });
