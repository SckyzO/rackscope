import { Activity } from 'lucide-react';
import { STATUS_COLOR } from '../../../dashboard/constants';
import { registerWidget, type WidgetRegistration } from '../../../dashboard/registry';
import type { DashboardData, WidgetProps } from '../../../dashboard/types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'slurm-cluster',
  title: 'Slurm Cluster',
  description: 'HPC cluster status and node breakdown',
  group: 'Overview',
  icon: Activity,
  defaultW: 8,
  defaultH: 2,
  minW: 2,
  minH: 1,
  showTitle: true,
  requiresPlugin: 'slurm',
};

// ── Component ──────────────────────────────────────────────────────────────
export const SlurmClusterWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: WidgetProps['navigate'];
}) => {
  if (!data.slurmEnabled || !data.slurm) return null;
  const slurmTotal = data.slurm.total_nodes ?? 0;
  const slurmStatus = data.slurm.by_status ?? {};
  const slurmSevs = data.slurm.by_severity ?? {};
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <div className="flex h-6 w-full overflow-hidden rounded-full">
              {Object.entries(slurmStatus)
                .filter(([, v]) => v > 0)
                .map(([st, count]) => (
                  <div
                    key={st}
                    title={`${st}: ${count}`}
                    className="h-full transition-all"
                    style={{
                      width: `${(count / slurmTotal) * 100}%`,
                      backgroundColor: STATUS_COLOR[st.toLowerCase()] ?? '#6b7280',
                    }}
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(slurmStatus)
                .filter(([, v]) => v > 0)
                .map(([st, count]) => (
                  <div
                    key={st}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[st.toLowerCase()] ?? '#6b7280' }}
                    />
                    <span className="capitalize">{st}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total', value: slurmTotal, color: 'text-gray-500' },
              { label: 'CRIT', value: slurmSevs['CRIT'] ?? 0, color: 'text-red-500' },
              { label: 'WARN', value: slurmSevs['WARN'] ?? 0, color: 'text-amber-500' },
              { label: 'OK', value: slurmSevs['OK'] ?? 0, color: 'text-green-500' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-800"
              >
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-5 py-2 dark:border-gray-800">
        <button
          onClick={() => navigate('/slurm/overview')}
          className="text-brand-500 text-xs hover:underline"
        >
          Details →
        </button>
      </div>
    </div>
  );
};

registerWidget({ ...WIDGET_META, component: SlurmClusterWidget });
