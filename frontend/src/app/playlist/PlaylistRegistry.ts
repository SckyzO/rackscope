import type { ElementType } from 'react';
import {
  BarChart2,
  Globe,
  DoorOpen,
  Cpu,
  Activity,
  MapPin,
  List,
  AlertTriangle,
  Bell,
  Server,
  LayoutDashboard,
  LayoutGrid,
  Monitor,
} from 'lucide-react';
import type { RoomSummary } from '@src/types';
import type { Dashboard } from '../dashboard/types';

// ── Icon registry ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, ElementType> = {
  BarChart2,
  Globe,
  DoorOpen,
  Cpu,
  Activity,
  MapPin,
  List,
  AlertTriangle,
  Bell,
  Server,
  LayoutDashboard,
  LayoutGrid,
  Monitor,
};

export const getIcon = (name: string): ElementType => ICON_MAP[name] ?? BarChart2;

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlaylistMode = 'normal' | 'focused' | 'kiosk';

export type RegistryPage = {
  id: string;
  title: string;
  iconName: string;
  route: string;
  dynamic?: 'rooms';
  requiresPlugin?: 'slurm';
  requiresFeature?: 'worldmap' | 'notifications';
}

export type RegistryCategory = {
  id: string;
  label: string;
  iconName: string;
  pages: RegistryPage[];
  requiresPlugin?: 'slurm';
}

export type PlaylistQueueItem = {
  id: string;
  title: string;
  route: string;
  iconName: string;
  duration: number; // seconds, 0 = use global
}

// ── Registry definition ───────────────────────────────────────────────────────

export const PLAYLIST_REGISTRY: RegistryCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    iconName: 'BarChart2',
    pages: [{ id: 'dashboard', title: 'Dashboard', iconName: 'BarChart2', route: '/' }],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    iconName: 'Server',
    pages: [
      {
        id: 'room-{id}',
        title: 'Room: {name}',
        iconName: 'DoorOpen',
        route: '/views/room/{id}',
        dynamic: 'rooms',
      },
    ],
  },
  {
    id: 'slurm',
    label: 'Slurm',
    iconName: 'Cpu',
    requiresPlugin: 'slurm',
    pages: [
      {
        id: 'slurm-overview',
        title: 'Slurm Overview',
        iconName: 'Activity',
        route: '/slurm/overview',
      },
      {
        id: 'slurm-wallboard',
        title: 'Wallboard',
        iconName: 'LayoutGrid',
        route: '/slurm/wallboard',
        requiresPlugin: 'slurm',
      },
      {
        id: 'slurm-nodes',
        title: 'Slurm Nodes',
        iconName: 'List',
        route: '/slurm/nodes',
      },
      {
        id: 'slurm-alerts',
        title: 'Slurm Alerts',
        iconName: 'AlertTriangle',
        route: '/slurm/alerts',
      },
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    iconName: 'Bell',
    pages: [
      {
        id: 'worldmap',
        title: 'World Map',
        iconName: 'Globe',
        route: '/views/worldmap',
        requiresFeature: 'worldmap',
      },
      {
        id: 'cluster-overview',
        title: 'Cluster Overview',
        iconName: 'Monitor',
        route: '/views/cluster',
      },
      {
        id: 'notifications',
        title: 'Notifications',
        iconName: 'Bell',
        route: '/notifications',
        requiresFeature: 'notifications',
      },
    ],
  },
];

// ── expandRegistry ─────────────────────────────────────────────────────────────

type ExpandOptions = {
  rooms: RoomSummary[];
  features: { worldmap: boolean; notifications: boolean };
  pluginSlurm: boolean;
}

export type ExpandedCategory = {
  id: string;
  label: string;
  iconName: string;
  pages: PlaylistQueueItem[];
}

export const expandRegistry = (
  registry: RegistryCategory[],
  { rooms, features, pluginSlurm }: ExpandOptions
): ExpandedCategory[] => {
  return registry
    .filter((cat) => {
      if (cat.requiresPlugin === 'slurm' && !pluginSlurm) return false;
      return true;
    })
    .map((cat) => {
      const expanded: PlaylistQueueItem[] = [];

      for (const page of cat.pages) {
        if (page.requiresFeature === 'worldmap' && !features.worldmap) continue;
        if (page.requiresFeature === 'notifications' && !features.notifications) continue;
        if (page.requiresPlugin === 'slurm' && !pluginSlurm) continue;

        if (page.dynamic === 'rooms') {
          for (const room of rooms) {
            expanded.push({
              id: page.id.replace('{id}', room.id),
              title: page.title.replace('{name}', room.name).replace('{id}', room.id),
              route: page.route.replace('{id}', room.id),
              iconName: page.iconName,
              duration: 0,
            });
          }
        } else {
          expanded.push({
            id: page.id,
            title: page.title,
            route: page.route,
            iconName: page.iconName,
            duration: 0,
          });
        }
      }

      return { id: cat.id, label: cat.label, iconName: cat.iconName, pages: expanded };
    })
    .filter((cat) => cat.pages.length > 0);
};

// ── getDashboardPlaylistItems ──────────────────────────────────────────────────

/**
 * Returns playlist items for all dashboards that have inPlaylist=true.
 * Reads directly from localStorage so it stays in sync without a React context.
 */
export const getDashboardPlaylistItems = (): PlaylistQueueItem[] => {
  try {
    const stored = localStorage.getItem('rackscope.dashboards');
    if (!stored) return [];
    return (JSON.parse(stored) as Dashboard[])
      .filter((d) => d.inPlaylist)
      .map((d) => ({
        id: `dashboard-${d.id}`,
        title: d.name,
        route: `/dashboard/${d.id}`,
        iconName: 'LayoutDashboard',
        duration: 0,
      }));
  } catch {
    return [];
  }
};
