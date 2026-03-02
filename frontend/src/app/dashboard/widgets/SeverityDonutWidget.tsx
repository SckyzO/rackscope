import { Globe } from 'lucide-react';
import { SeverityDonut } from '../primitives';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const SeverityDonutWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <SeverityDonut slices={data.donutSlices} />
    <div className="flex-1 space-y-2">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Severity Distribution
      </p>
      {data.donutSlices.map((s) => (
        <div key={s.label} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
              {s.count}
            </span>
            <span className="text-gray-400">
              {data.totalDevices > 0 ? Math.round((s.count / data.totalDevices) * 100) : 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

registerWidget({
  type: 'severity-donut',
  title: 'Severity Distribution',
  description: 'CRIT / WARN / OK node distribution',
  defaultW: 4,
  defaultH: 2,
  icon: Globe,
  group: 'Charts',
  component: SeverityDonutWidget,
});
