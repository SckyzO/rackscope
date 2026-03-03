import { Globe } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../registry';
import type { DashboardData } from '../types';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'site-map',
  title: 'Site Map',
  description: 'Sites with room counts',
  group: 'Overview',
  icon: Globe,
  defaultW: 4,
  defaultH: 2,
  minW: 1,
  minH: 1,
  showTitle: true,
};

// ── Component ──────────────────────────────────────────────────────────────
export const SiteMapWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col p-4">
    <div className="space-y-2">
      {data.sites.map((s) => (
        <div key={s.id} className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
          <span className="text-gray-400">{s.rooms?.length ?? 0} rooms</span>
        </div>
      ))}
      {data.sites.length === 0 && <p className="text-xs text-gray-400">No sites</p>}
    </div>
  </div>
);

registerWidget({ ...WIDGET_META, component: SiteMapWidget });
