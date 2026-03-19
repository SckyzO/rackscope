import { Server } from 'lucide-react';
import { HC, SEV_PILL } from '../constants';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData, WidgetProps } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'infrastructure',
  title: 'Infrastructure',
  description: 'Rooms health overview',
  group: 'Overview',
  icon: Server,
  defaultW: 4,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
export const InfrastructureWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: WidgetProps['navigate'];
}) => (
  <div className="flex h-full flex-col overflow-hidden">
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
    <div className="shrink-0 border-t border-gray-100 px-5 py-2 dark:border-gray-800">
      <button
        onClick={() => navigate('/views/worldmap')}
        className="text-brand-500 text-xs hover:underline"
      >
        World Map →
      </button>
    </div>
  </div>
);

registerWidget({ ...WIDGET_META, component: InfrastructureWidget });
