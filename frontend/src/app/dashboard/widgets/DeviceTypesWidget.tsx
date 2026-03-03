import { Layers } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'device-types',
  title: 'Device Types',
  description: 'Template types breakdown',
  group: 'Catalog',
  icon: Layers,
  defaultW: 4,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
export const DeviceTypesWidget = ({ data }: { data: DashboardData }) => {
  const types = data.deviceTemplates.reduce<Record<string, number>>((a, t) => {
    const key = t.type ?? 'other';
    a[key] = (a[key] ?? 0) + 1;
    return a;
  }, {});
  const total = data.deviceTemplates.length;
  return (
    <div className="flex h-full flex-col p-4">
      <div className="space-y-1.5">
        {Object.entries(types)
          .sort(([, a], [, b]) => b - a)
          .map(([type, n]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }}
                />
              </div>
              <span className="w-16 text-gray-600 capitalize dark:text-gray-400">{type}</span>
              <span className="w-4 text-right font-mono text-gray-700 dark:text-gray-300">{n}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

registerWidget({ ...WIDGET_META, component: DeviceTypesWidget });
