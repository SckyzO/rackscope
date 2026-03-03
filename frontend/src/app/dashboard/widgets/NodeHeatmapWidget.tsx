import { useState } from 'react';
import { Cpu, CheckCircle } from 'lucide-react';
import { HC } from '../constants';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';
import type { ActiveAlert } from '../../../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'node-heatmap',
  title: 'Node Health',
  description: 'Alert nodes grouped by room with CRIT/WARN/OK summary',
  group: 'Monitoring',
  icon: Cpu,
  defaultW: 6,
  defaultH: 3,
  minW: 2,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
type NodeTooltip = { alert: ActiveAlert; x: number; y: number };

export const NodeHeatmapWidget = ({ data }: { data: DashboardData }) => {
  const [tooltip, setTooltip] = useState<NodeTooltip | null>(null);

  const critAlerts = data.alerts.filter((a) => a.state === 'CRIT');
  const warnAlerts = data.alerts.filter((a) => a.state === 'WARN');
  const okCount = Math.max(0, data.totalDevices - critAlerts.length - warnAlerts.length);

  const byRoom = new Map<string, { name: string; alerts: ActiveAlert[] }>();
  for (const a of data.alerts) {
    if (!byRoom.has(a.room_id)) byRoom.set(a.room_id, { name: a.room_name, alerts: [] });
    (byRoom.get(a.room_id) as { name: string; alerts: ActiveAlert[] }).alerts.push(a);
  }
  const affectedRooms = [...byRoom.values()].sort(
    (a, b) =>
      (b.alerts.some((x) => x.state === 'CRIT') ? 1 : 0) -
      (a.alerts.some((x) => x.state === 'CRIT') ? 1 : 0)
  );

  return (
    <div className="flex h-full flex-col p-4">
      {/* Summary counts row */}
      <div className="mb-3 flex items-center justify-end gap-2.5 text-xs">
        {critAlerts.length > 0 && (
          <span className="font-semibold text-red-500">{critAlerts.length} CRIT</span>
        )}
        {warnAlerts.length > 0 && (
          <span className="font-semibold text-amber-500">{warnAlerts.length} WARN</span>
        )}
        <span className="text-gray-400">{okCount} OK</span>
      </div>

      {/* Content */}
      {affectedRooms.length === 0 ? (
        <div className="flex flex-1 items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            All nodes healthy
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto">
          {affectedRooms.map((room) => (
            <div key={room.name}>
              <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {room.name}
              </p>
              <div className="flex flex-wrap gap-1">
                {room.alerts
                  .sort((a, b) => (a.state === 'CRIT' ? -1 : 1) - (b.state === 'CRIT' ? -1 : 1))
                  .map((a) => (
                    <div
                      key={a.node_id}
                      className="h-5 w-5 cursor-default rounded-sm"
                      style={{ backgroundColor: HC[a.state] ?? HC.UNKNOWN }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ alert: a, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip — fixed so it escapes overflow:hidden/auto containers */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[200]"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <div className="rounded-xl bg-gray-900 px-3 py-2 shadow-2xl dark:bg-gray-800">
            <p className="font-mono text-sm font-bold text-white">{tooltip.alert.node_id}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {tooltip.alert.rack_name} · {tooltip.alert.room_name}
            </p>
            {tooltip.alert.checks.length > 0 && (
              <p className="mt-1 font-mono text-[10px] text-gray-500">
                {tooltip.alert.checks[0].id}
                {tooltip.alert.checks.length > 1 ? ` +${tooltip.alert.checks.length - 1}` : ''}
              </p>
            )}
            <p
              className="mt-1 text-xs font-bold"
              style={{ color: HC[tooltip.alert.state] ?? HC.UNKNOWN }}
            >
              {tooltip.alert.state}
            </p>
          </div>
          <div
            className="mx-auto h-0 w-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #111827',
            }}
          />
        </div>
      )}
    </div>
  );
};

registerWidget({ ...WIDGET_META, component: NodeHeatmapWidget });
