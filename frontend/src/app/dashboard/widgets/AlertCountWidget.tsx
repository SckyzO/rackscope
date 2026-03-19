import { XCircle } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'alert-count',
  title: 'Alert Count',
  description: 'CRIT + WARN count prominent display',
  group: 'Stats',
  icon: XCircle,
  defaultW: 3,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: false,
};

// ── Component ──────────────────────────────────────────────────────────────
export const AlertCountWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 p-6">
    <div className="flex items-baseline gap-3">
      <span className="text-5xl font-black text-red-500">{data.critCount}</span>
      <span className="text-2xl font-bold text-amber-500">+{data.warnCount}</span>
    </div>
    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Active Alerts</p>
  </div>
);

registerWidget({ ...WIDGET_META, component: AlertCountWidget });
