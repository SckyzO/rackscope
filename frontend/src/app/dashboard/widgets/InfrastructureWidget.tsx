import { Server } from 'lucide-react';
import { HC, SEV_PILL } from '../constants';
import { registerWidget } from '../registry';
import type { DashboardData, WidgetProps } from '../types';

export const InfrastructureWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: WidgetProps['navigate'];
}) => (
  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <Server className="text-brand-500 h-4 w-4" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Infrastructure</h2>
      </div>
      <button
        onClick={() => navigate('/views/worldmap')}
        className="text-brand-500 text-xs hover:underline"
      >
        World Map →
      </button>
    </div>
    <div className="flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
      {data.allRooms.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">No rooms configured</div>
      ) : (
        data.allRooms.map((room) => (
          <button
            key={room.id}
            onClick={() => navigate(`/views/room/${room.id}`)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: HC[room.state] ?? HC.UNKNOWN }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {room.name}
              </p>
              <p className="truncate text-[11px] text-gray-400">{room.siteName}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_PILL[room.state] ?? SEV_PILL.UNKNOWN}`}
            >
              {room.state}
            </span>
          </button>
        ))
      )}
    </div>
  </div>
);

registerWidget({
  type: 'infrastructure',
  title: 'Infrastructure',
  description: 'Rooms health overview',
  defaultW: 4,
  defaultH: 2,
  icon: Server,
  group: 'Overview',
  component: InfrastructureWidget,
});
