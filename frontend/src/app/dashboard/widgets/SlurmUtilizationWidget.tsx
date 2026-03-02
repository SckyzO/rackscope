import { Activity } from 'lucide-react';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const SlurmUtilizationWidget = ({ data }: { data: DashboardData }) => {
  if (!data.slurmEnabled || !data.slurm)
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900">
        Slurm not enabled
      </div>
    );
  const total = data.slurm.total_nodes;
  const allocated = (data.slurm.by_status?.allocated ?? 0) + (data.slurm.by_status?.alloc ?? 0);
  const pct = total > 0 ? Math.round((allocated / total) * 100) : 0;
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Slurm Utilization
      </p>
      <div className="flex items-center gap-4">
        <p
          className="text-4xl font-black"
          style={{ color: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981' }}
        >
          {pct}%
        </p>
        <div className="flex-1 space-y-1">
          <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400">
            {allocated}/{total} nodes allocated
          </p>
        </div>
      </div>
    </div>
  );
};

registerWidget({
  type: 'slurm-utilization',
  title: 'Slurm Utilization',
  description: 'Allocated % gauge',
  defaultW: 6,
  defaultH: 3,
  icon: Activity,
  group: 'Charts',
  requiresSlurm: true,
  component: SlurmUtilizationWidget,
});
