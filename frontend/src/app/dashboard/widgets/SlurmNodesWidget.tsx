import { Activity } from 'lucide-react';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const SlurmNodesWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    {data.slurmEnabled && data.slurm ? (
      <>
        <p className="text-5xl font-black text-purple-500">{data.slurm.total_nodes}</p>
        <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Slurm Nodes</p>
      </>
    ) : (
      <p className="text-xs text-gray-400">Slurm not enabled</p>
    )}
  </div>
);

registerWidget({
  type: 'slurm-nodes',
  title: 'Slurm Nodes',
  description: 'Total Slurm nodes count',
  defaultW: 3,
  defaultH: 2,
  icon: Activity,
  group: 'Stats',
  requiresSlurm: true,
  component: SlurmNodesWidget,
});
