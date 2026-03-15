import { Activity } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '@app/dashboard/registry';
import type { DashboardData } from '@app/dashboard/types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'slurm-nodes',
  title: 'Slurm Nodes',
  description: 'Total Slurm nodes count',
  group: 'Stats',
  icon: Activity,
  defaultW: 3,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: false,
  requiresPlugin: 'slurm',
};

// ── Component ──────────────────────────────────────────────────────────────
export const SlurmNodesWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-1 p-5">
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

registerWidget({ ...WIDGET_META, component: SlurmNodesWidget });
