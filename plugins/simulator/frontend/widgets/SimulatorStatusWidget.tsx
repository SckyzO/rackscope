import { useEffect, useState } from 'react';
import { FlaskConical, ExternalLink } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '@app/dashboard/registry';
import type { WidgetProps } from '@app/dashboard/types';
import { api } from '@src/services/api';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'simulator-status',
  title: 'Simulator',
  description: 'Running state, active scenario and overrides count',
  group: 'Overview',
  icon: FlaskConical,
  defaultW: 4,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: true,
  requiresPlugin: 'simulator',
};

// ── Component ──────────────────────────────────────────────────────────────
type SimulatorStatus = {
  running: boolean;
  endpoint: string;
  update_interval: number;
  scenario: string | null;
  overrides_count: number;
};

export const SimulatorStatusWidget = ({ navigate }: { navigate: WidgetProps['navigate'] }) => {
  const [status, setStatus] = useState<SimulatorStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSimulatorStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 items-center justify-center p-5">
        {loading ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : status === null ? (
          <p className="text-xs text-gray-400">Simulator unavailable</p>
        ) : (
          <div className="w-full space-y-3">
            {/* Running state */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  status.running
                    ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status.running ? 'bg-green-500' : 'bg-red-500'}`}
                />
                {status.running ? 'Running' : 'Stopped'}
              </span>
            </div>

            {/* Scenario */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Scenario</span>
              <span className="max-w-[140px] truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                {status.scenario ?? '—'}
              </span>
            </div>

            {/* Overrides */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Active overrides</span>
              <span
                className={`text-xs font-bold ${
                  status.overrides_count > 0 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {status.overrides_count}
              </span>
            </div>

            {/* Interval */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Update interval</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {status.update_interval}s
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-gray-100 px-5 py-2 dark:border-gray-800">
        <button
          onClick={() => navigate('/editors/settings')}
          className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
        >
          Settings
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

registerWidget({ ...WIDGET_META, component: SimulatorStatusWidget });
