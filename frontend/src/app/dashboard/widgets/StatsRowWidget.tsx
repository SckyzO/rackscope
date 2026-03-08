import { Globe, DoorOpen, Server, Cpu, XCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import { StatCard } from '../primitives';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'stats-row',
  title: 'Stats Overview',
  description: 'Sites, rooms, racks, devices, CRIT, WARN counts',
  group: 'Legacy',
  icon: BarChart2,
  defaultW: 12,
  defaultH: 1,
  minW: 2,
  minH: 1,
  showTitle: false,
};

// ── Component ──────────────────────────────────────────────────────────────
export const StatsRowWidget = ({ data }: { data: DashboardData }) => (
  <div className="grid h-full grid-cols-2 items-stretch gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6">
    {[
      { icon: Globe, label: 'Sites', value: data.sites.length, color: '#465fff' },
      { icon: DoorOpen, label: 'Rooms', value: data.totalRooms, color: '#8b5cf6' },
      { icon: Server, label: 'Racks', value: data.totalRacks, color: '#06b6d4' },
      { icon: Cpu, label: 'Devices', value: data.totalDevices, color: '#10b981' },
      {
        icon: XCircle,
        label: 'CRIT',
        value: data.critCount,
        color: '#ef4444',
        sub:
          data.critCount === 0
            ? 'All clear'
            : `${data.critCount} node${data.critCount > 1 ? 's' : ''}`,
      },
      {
        icon: AlertTriangle,
        label: 'WARN',
        value: data.warnCount,
        color: '#f59e0b',
        sub:
          data.warnCount === 0
            ? 'All clear'
            : `${data.warnCount} node${data.warnCount > 1 ? 's' : ''}`,
      },
    ].map((item) => (
      <div
        key={item.label}
        className="rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50"
      >
        <StatCard
          icon={item.icon}
          label={item.label}
          value={item.value}
          color={item.color}
          sub={item.sub}
        />
      </div>
    ))}
  </div>
);

registerWidget({ ...WIDGET_META, component: StatsRowWidget });
