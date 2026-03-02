import { Activity, CheckCircle } from 'lucide-react';
import { HealthGauge } from '../primitives';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const HealthGaugeWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <HealthGauge score={data.healthScore} />
    <div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Health Score</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {data.totalDevices - data.critCount - data.warnCount} / {data.totalDevices} devices healthy
      </p>
      {data.critCount > 0 && (
        <p className="mt-2 text-xs text-red-500">
          {data.critCount} CRIT alert{data.critCount > 1 ? 's' : ''}
        </p>
      )}
      {data.warnCount > 0 && (
        <p className="text-xs text-amber-500">
          {data.warnCount} WARN alert{data.warnCount > 1 ? 's' : ''}
        </p>
      )}
      {data.critCount === 0 && data.warnCount === 0 && (
        <p className="mt-2 flex items-center gap-1 text-xs text-green-500">
          <CheckCircle className="h-3.5 w-3.5" /> All devices healthy
        </p>
      )}
    </div>
  </div>
);

registerWidget({
  type: 'health-gauge',
  title: 'Health Score',
  description: 'Overall infrastructure health as a gauge',
  defaultW: 4,
  defaultH: 2,
  icon: Activity,
  group: 'Charts',
  component: HealthGaugeWidget,
});
