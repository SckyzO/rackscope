import { Globe, DoorOpen, Server, Cpu, XCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import { StatCard } from '../primitives';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const StatsRowWidget = ({ data }: { data: DashboardData }) => (
  <div className="grid h-full grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-6">
    <StatCard icon={Globe} label="Sites" value={data.sites.length} color="#465fff" />
    <StatCard icon={DoorOpen} label="Rooms" value={data.totalRooms} color="#8b5cf6" />
    <StatCard icon={Server} label="Racks" value={data.totalRacks} color="#06b6d4" />
    <StatCard icon={Cpu} label="Devices" value={data.totalDevices} color="#10b981" />
    <StatCard
      icon={XCircle}
      label="CRIT"
      value={data.critCount}
      color="#ef4444"
      sub={
        data.critCount === 0
          ? 'All clear'
          : `${data.critCount} node${data.critCount > 1 ? 's' : ''}`
      }
    />
    <StatCard
      icon={AlertTriangle}
      label="WARN"
      value={data.warnCount}
      color="#f59e0b"
      sub={
        data.warnCount === 0
          ? 'All clear'
          : `${data.warnCount} node${data.warnCount > 1 ? 's' : ''}`
      }
    />
  </div>
);

registerWidget({
  type: 'stats-row',
  title: 'Stats Overview',
  description: 'Sites, rooms, racks, devices, CRIT, WARN counts',
  defaultW: 12,
  defaultH: 1,
  icon: BarChart2,
  group: 'Legacy',
  component: StatsRowWidget,
});
