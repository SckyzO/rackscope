import { Bell, CheckCircle, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { AlertRow } from '../primitives';
import { registerWidget } from '../registry';
import type { DashboardData, WidgetProps } from '../types';

export const ActiveAlertsWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: WidgetProps['navigate'];
}) => {
  const critCount = data.alerts.filter((a) => a.state === 'CRIT').length;
  const warnCount = data.alerts.filter((a) => a.state === 'WARN').length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <Bell className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Alerts</h2>
          {critCount > 0 && (
            <span className="bg-error-50 text-error-500 dark:bg-error-500/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
              <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
              {critCount} CRIT
            </span>
          )}
          {warnCount > 0 && (
            <span className="bg-warning-50 text-warning-500 dark:bg-warning-500/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
              <span className="bg-warning-500 h-1.5 w-1.5 rounded-full" />
              {warnCount} WARN
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors"
        >
          View all →
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        <div className="flex h-8 items-center gap-0.5 rounded-lg border border-gray-200 px-1 dark:border-gray-700">
          {[
            { id: 'all', label: 'All', count: data.alerts.length },
            { id: 'CRIT', label: 'Critical', count: critCount },
            { id: 'WARN', label: 'Warning', count: warnCount },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                data.setAlertStateFilter(f.id);
                data.setAlertPage(0);
              }}
              className={`flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                data.alertStateFilter === f.id
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span
                  className={`rounded-full px-1 text-[10px] font-bold ${
                    data.alertStateFilter === f.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {data.allRooms.length > 1 && (
          <select
            value={data.alertRoomFilter}
            onChange={(e) => {
              data.setAlertRoomFilter(e.target.value);
              data.setAlertPage(0);
            }}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            <option value="all">All rooms</option>
            {data.allRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={data.alertLimit}
          onChange={(e) => {
            data.setAlertLimit(Number(e.target.value));
            data.setAlertPage(0);
          }}
          className="ml-auto h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} rows
            </option>
          ))}
        </select>
      </div>

      {/* Body */}
      {data.alerts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <CheckCircle className="h-8 w-8 text-green-400" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            All systems healthy
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600">No active alerts</p>
        </div>
      ) : (
        <>
          <div className="flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {data.filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle className="h-7 w-7 text-green-400" />
                <p className="text-sm text-gray-400">No alerts match the filters</p>
              </div>
            ) : (
              data.filteredAlerts.map((alert, i) => (
                <AlertRow
                  key={i}
                  alert={alert}
                  onClick={() => navigate(`/views/rack/${alert.rack_id}`)}
                />
              ))
            )}
          </div>

          {/* Pagination footer */}
          {data.filteredAlertsAll.length > data.alertLimit && (
            <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
              <button
                onClick={() => data.setAlertPage(Math.max(0, data.safeAlertPage - 1))}
                disabled={data.safeAlertPage === 0}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-xs text-gray-400">
                <b className="text-gray-700 dark:text-gray-200">{data.safeAlertPage + 1}</b>
                {' / '}
                <b className="text-gray-700 dark:text-gray-200">{data.totalAlertPages}</b>
              </span>
              <button
                onClick={() =>
                  data.setAlertPage(Math.min(data.totalAlertPages - 1, data.safeAlertPage + 1))
                }
                disabled={data.safeAlertPage >= data.totalAlertPages - 1}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

registerWidget({
  type: 'active-alerts',
  title: 'Active Alerts',
  description: 'Live CRIT/WARN alerts with filters',
  defaultW: 8,
  defaultH: 2,
  icon: XCircle,
  group: 'Monitoring',
  component: ActiveAlertsWidget,
});
