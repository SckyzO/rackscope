import { Activity } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../../../dashboard/registry';
import type { DashboardData } from '../../../dashboard/types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'slurm-utilization',
  title: 'Slurm Utilization',
  description: 'Allocated % gauge',
  group: 'Charts',
  icon: Activity,
  defaultW: 6,
  defaultH: 3,
  minW: 2,
  minH: 1,
  showTitle: true,
  requiresPlugin: 'slurm',
};

// ── Component ──────────────────────────────────────────────────────────────
export const SlurmUtilizationWidget = ({ data }: { data: DashboardData }) => {
  if (!data.slurmEnabled || !data.slurm)
    return (
      <div className="flex h-full items-center justify-center p-5 text-xs text-gray-400">
        Slurm not enabled
      </div>
    );
  const total = data.slurm.total_nodes;
  const allocated = (data.slurm.by_status?.allocated ?? 0) + (data.slurm.by_status?.alloc ?? 0);
  const pct = total > 0 ? Math.round((allocated / total) * 100) : 0;
  return (
    <div className="flex h-full flex-col justify-center p-4">
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

registerWidget({ ...WIDGET_META, component: SlurmUtilizationWidget });
