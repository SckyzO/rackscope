import type {
  ActiveAlert,
  Site,
  SlurmSummary,
  PrometheusStats,
  DeviceTemplate,
  CheckDefinition,
} from '../../types';

export type RoomWithState = {
  id: string;
  name: string;
  siteName: string;
  state: string;
};

export type DonutSlice = { label: string; count: number; color: string };

export type StatKey = 'sites' | 'rooms' | 'racks' | 'devices' | 'crit' | 'warn';

export type WidgetType =
  | 'stat-card'
  | 'stats-row'
  | 'health-gauge'
  | 'severity-donut'
  | 'active-alerts'
  | 'slurm-cluster'
  | 'infrastructure'
  | 'prometheus'
  | 'catalog-checks'
  | 'alert-count'
  | 'rack-utilization'
  | 'node-heatmap'
  | 'uptime'
  | 'recent-alerts'
  | 'site-map'
  | 'check-summary'
  | 'device-types'
  | 'slurm-nodes'
  | 'slurm-utilization'
  | 'world-map'
  | 'simulator-status';

export type WidgetConfig = {
  id: string;
  type: WidgetType;
  // 2D grid position — react-grid-layout coordinates
  x: number;
  y: number;
  w: number; // column span (1-12)
  h: number; // row span
  minW?: number;
  minH?: number;
  statKey?: StatKey;
};

export type Dashboard = {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  inPlaylist?: boolean;
};

export type DashboardData = {
  alerts: ActiveAlert[];
  sites: Site[];
  roomStates: Record<string, string>;
  slurm: SlurmSummary | null;
  slurmEnabled: boolean;
  promStats: PrometheusStats | null;
  deviceTemplates: DeviceTemplate[];
  rackTemplateCount: number;
  checks: CheckDefinition[];
  critCount: number;
  warnCount: number;
  totalDevices: number;
  totalRacks: number;
  totalRooms: number;
  healthScore: number;
  allRooms: RoomWithState[];
  donutSlices: DonutSlice[];
  alertLimit: number;
  setAlertLimit: (n: number) => void;
  alertPage: number;
  setAlertPage: (n: number) => void;
  alertStateFilter: string;
  setAlertStateFilter: (s: string) => void;
  alertRoomFilter: string;
  setAlertRoomFilter: (s: string) => void;
  filteredAlerts: ActiveAlert[];
  filteredAlertsAll: ActiveAlert[];
  totalAlertPages: number;
  safeAlertPage: number;
  promNextSec: number;
  promConnected: boolean;
  devsByType: Record<string, number>;
  checksByScope: Record<string, number>;
};

export type WidgetProps = {
  widget: WidgetConfig;
  data: DashboardData;
  navigate: (path: string) => void;
};
