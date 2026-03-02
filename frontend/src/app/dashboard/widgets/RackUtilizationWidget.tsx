import { Server } from 'lucide-react';
import { WidgetPlaceholder } from '../primitives';
import { HC } from '../constants';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const RackUtilizationWidget = ({ data }: { data: DashboardData }) => {
  const rooms = data.allRooms.slice(0, 6);
  if (rooms.length === 0) return <WidgetPlaceholder title="Rack Utilization" icon={Server} />;
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Rack Utilization
      </p>
      <div className="space-y-2">
        {rooms.map((r) => (
          <div key={r.id} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{r.name}</span>
              <span className="text-gray-700 dark:text-gray-300">{r.state}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${r.state === 'CRIT' ? 90 : r.state === 'WARN' ? 60 : r.state === 'OK' ? 40 : 20}%`,
                  backgroundColor: HC[r.state] ?? HC.UNKNOWN,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

registerWidget({
  type: 'rack-utilization',
  title: 'Rack Utilization',
  description: 'Fill % per room as bar chart',
  defaultW: 6,
  defaultH: 3,
  icon: Server,
  group: 'Charts',
  component: RackUtilizationWidget,
});
