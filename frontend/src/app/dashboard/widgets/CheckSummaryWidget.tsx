import { ShieldCheck } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'check-summary',
  title: 'Check Summary',
  description: 'Checks library stats',
  group: 'Catalog',
  icon: ShieldCheck,
  defaultW: 3,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
export const CheckSummaryWidget = ({ data }: { data: DashboardData }) => {
  const scopes = data.checks.reduce<Record<string, number>>((a, c) => {
    const key = c.scope ?? 'unknown';
    a[key] = (a[key] ?? 0) + 1;
    return a;
  }, {});
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-end gap-4">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {data.checks.length}
        </span>
        <div className="space-y-0.5 pb-0.5">
          {Object.entries(scopes).map(([scope, n]) => (
            <div key={scope} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="capitalize">{scope}</span>
              <span className="font-semibold">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

registerWidget({ ...WIDGET_META, component: CheckSummaryWidget });
