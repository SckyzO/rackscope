import { ShieldCheck, Cpu } from 'lucide-react';
import { DEV_TYPE_ICON, DEV_TYPE_COLOR } from '../constants';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'catalog-checks',
  title: 'Catalog & Checks',
  description: 'Templates and checks library stats',
  group: 'Catalog',
  icon: ShieldCheck,
  defaultW: 4,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
export const CatalogChecksWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col overflow-y-auto p-5">
    {Object.keys(data.devsByType).length > 0 && (
      <div className="mb-4 space-y-2">
        <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
          Device Templates ({data.deviceTemplates.length})
        </p>
        {Object.entries(data.devsByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => {
            const Icon = DEV_TYPE_ICON[type] ?? Cpu;
            const color = DEV_TYPE_COLOR[type] ?? DEV_TYPE_COLOR.other;
            const pct = Math.round((count / data.deviceTemplates.length) * 100);
            return (
              <div key={type} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3 shrink-0" style={{ color }} />
                    <span className="text-gray-600 capitalize dark:text-gray-400">{type}</span>
                  </div>
                  <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                    {count}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
          <span>Rack templates</span>
          <span className="font-mono font-medium text-gray-600 dark:text-gray-400">
            {data.rackTemplateCount}
          </span>
        </div>
      </div>
    )}

    {data.checks.length > 0 && (
      <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
        <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
          Checks Library ({data.checks.length})
        </p>
        {Object.entries(data.checksByScope)
          .sort(([, a], [, b]) => b - a)
          .map(([scope, count]) => (
            <div key={scope} className="flex items-center justify-between text-xs">
              <span className="text-gray-500 capitalize dark:text-gray-400">{scope} scope</span>
              <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                {count}
              </span>
            </div>
          ))}
      </div>
    )}
  </div>
);

registerWidget({ ...WIDGET_META, component: CatalogChecksWidget });
