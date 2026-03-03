import { Zap } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'uptime',
  title: 'Scrape Latency',
  description: 'Last Prometheus scrape latency',
  group: 'Stats',
  icon: Zap,
  defaultW: 3,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: false,
};

// ── Component ──────────────────────────────────────────────────────────────
export const UptimeWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-1 p-5">
    <Zap className="h-6 w-6 text-amber-500" />
    <p className="text-2xl font-bold text-gray-900 dark:text-white">
      {data.promStats?.last_ms ? `${Math.round(data.promStats.last_ms)} ms` : '—'}
    </p>
    <p className="text-xs text-gray-400">Last scrape latency</p>
  </div>
);

registerWidget({ ...WIDGET_META, component: UptimeWidget });
