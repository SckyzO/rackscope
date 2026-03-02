import { Globe } from 'lucide-react';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

export const SiteMapWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">Sites</p>
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

registerWidget({
  type: 'site-map',
  title: 'Site Map',
  description: 'Sites with room counts',
  defaultW: 4,
  defaultH: 2,
  icon: Globe,
  group: 'Overview',
  component: SiteMapWidget,
});
