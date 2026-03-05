// Import all widget files to trigger their registerWidget() side effects.
// The order here is intentional: it matches the WIDGET_PICKER group order
// (Stats → Charts → Monitoring → Overview → Catalog → Legacy).

import './widgets/StatCardWidget';
import './widgets/AlertCountWidget';
import './widgets/UptimeWidget';

import './widgets/HealthGaugeWidget';
import './widgets/SeverityDonutWidget';
import './widgets/RackUtilizationWidget';

import './widgets/ActiveAlertsWidget';
import './widgets/RecentAlertsWidget';
import './widgets/NodeHeatmapWidget';
import './widgets/WorldMapWidget';

import './widgets/InfrastructureWidget';
import './widgets/SiteMapWidget';
import './widgets/PrometheusWidget';

import './widgets/CatalogChecksWidget';
import './widgets/CheckSummaryWidget';
import './widgets/DeviceTypesWidget';

import './widgets/StatsRowWidget';

// Plugin widgets — self-register via their index files
import '@plugins/slurm/frontend/widgets';
import '@plugins/simulator/frontend/widgets';

export { registerWidget, getWidget, getAllWidgets } from './registry';
export type { WidgetRegistration, WidgetGroup } from './registry';
export type {
  WidgetType,
  WidgetConfig,
  Dashboard,
  DashboardData,
  RoomWithState,
  DonutSlice,
  StatKey,
  WidgetProps,
} from './types';
export {
  HC,
  SEV_PILL,
  STATUS_COLOR,
  DEV_TYPE_COLOR,
  DEV_TYPE_ICON,
  ROW_PX,
  DASHBOARDS_STORAGE_KEY,
  ACTIVE_DASHBOARD_STORAGE_KEY,
  DASHBOARDS_STORAGE_VERSION_KEY,
  DASHBOARDS_STORAGE_VERSION,
  DEFAULT_WIDGETS,
} from './constants';
