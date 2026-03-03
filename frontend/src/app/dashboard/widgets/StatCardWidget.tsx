import { Globe, DoorOpen, Server, Cpu, XCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import { StatCard } from '../primitives';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData, WidgetConfig } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'stat-card',
  title: 'Stat Card',
  description: 'Single metric (sites, rooms, racks...)',
  group: 'Stats',
  icon: BarChart2,
  defaultW: 2,
  defaultH: 1,
  minW: 1,
  minH: 1,
  showTitle: false,
};

// ── Component ──────────────────────────────────────────────────────────────
const STAT_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    getValue: (d: DashboardData) => string | number;
    getSub?: (d: DashboardData) => string;
  }
> = {
  sites: { label: 'Sites', icon: Globe, color: '#465fff', getValue: (d) => d.sites.length },
  rooms: { label: 'Rooms', icon: DoorOpen, color: '#8b5cf6', getValue: (d) => d.totalRooms },
  racks: { label: 'Racks', icon: Server, color: '#06b6d4', getValue: (d) => d.totalRacks },
  devices: { label: 'Devices', icon: Cpu, color: '#10b981', getValue: (d) => d.totalDevices },
  crit: {
    label: 'CRIT',
    icon: XCircle,
    color: '#ef4444',
    getValue: (d) => d.critCount,
    getSub: (d) =>
      d.critCount === 0 ? 'All clear' : `${d.critCount} node${d.critCount > 1 ? 's' : ''}`,
  },
  warn: {
    label: 'WARN',
    icon: AlertTriangle,
    color: '#f59e0b',
    getValue: (d) => d.warnCount,
    getSub: (d) =>
      d.warnCount === 0 ? 'All clear' : `${d.warnCount} node${d.warnCount > 1 ? 's' : ''}`,
  },
};

export const StatCardWidget = ({ widget, data }: { widget: WidgetConfig; data: DashboardData }) => {
  const cfg = STAT_CONFIG[widget.statKey ?? 'sites'];
  if (!cfg) return null;
  return (
    <StatCard
      icon={cfg.icon}
      label={cfg.label}
      value={cfg.getValue(data)}
      color={cfg.color}
      sub={cfg.getSub?.(data)}
    />
  );
};

registerWidget({ ...WIDGET_META, component: StatCardWidget });
