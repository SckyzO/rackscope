import React from 'react';
import {
  Info, FolderOpen, RefreshCw, Database, Zap, MapPin,
} from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { FormToggle } from '../common/FormToggle';
import type { ConfigDraft } from '../useSettingsConfig';

interface AppSettingsSectionProps {
  draft: ConfigDraft;
  setDraft: React.Dispatch<React.SetStateAction<ConfigDraft | null>>;
}

export const AppSettingsSection: React.FC<AppSettingsSectionProps> = ({ draft, setDraft }) => {
  const update = (section: keyof ConfigDraft, field: string, value: string | number | boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
    });
  };

  return (
    <div className="space-y-4">
      <FormSection title="Application Info" icon={Info} iconColor="text-brand-500" iconBg="bg-brand-50 dark:bg-brand-500/10">
        <FormField
          label="Application Name"
          value={draft.app.name}
          onChange={(value) => update('app', 'name', value)}
        />
        <FormField
          label="Description"
          value={draft.app.description}
          onChange={(value) => update('app', 'description', value)}
        />
      </FormSection>

      <FormSection title="Paths" icon={FolderOpen} iconColor="text-amber-500" iconBg="bg-amber-50 dark:bg-amber-500/10">
        <FormField
          label="Topology Path"
          value={draft.paths.topology}
          onChange={(value) => update('paths', 'topology', value)}
          placeholder="config/topology"
        />
        <FormField
          label="Templates Path"
          value={draft.paths.templates}
          onChange={(value) => update('paths', 'templates', value)}
          placeholder="config/templates"
        />
        <FormField
          label="Checks Path"
          value={draft.paths.checks}
          onChange={(value) => update('paths', 'checks', value)}
          placeholder="config/checks"
        />
        <FormField
          label="Metrics Path"
          value={draft.paths.metrics}
          onChange={(value) => update('paths', 'metrics', value)}
          placeholder="config/metrics/library"
        />
      </FormSection>

      <FormSection title="Refresh Intervals" description="UI refresh intervals in seconds" icon={RefreshCw} iconColor="text-green-500" iconBg="bg-green-50 dark:bg-green-500/10">
        <FormField
          label="Room State Refresh (seconds)"
          value={draft.refresh.room_state_seconds}
          onChange={(value) => update('refresh', 'room_state_seconds', value)}
          type="number"
        />
        <FormField
          label="Rack State Refresh (seconds)"
          value={draft.refresh.rack_state_seconds}
          onChange={(value) => update('refresh', 'rack_state_seconds', value)}
          type="number"
        />
      </FormSection>

      <FormSection title="Cache" description="Prometheus query cache TTL (two-level caching)" icon={Database} iconColor="text-purple-500" iconBg="bg-purple-50 dark:bg-purple-500/10">
        <FormField
          label="Legacy TTL (seconds)"
          value={draft.cache.ttl_seconds}
          onChange={(value) => update('cache', 'ttl_seconds', value)}
          type="number"
        />
        <FormField
          label="Health Checks TTL (seconds)"
          value={draft.cache.health_checks_ttl_seconds}
          onChange={(value) => update('cache', 'health_checks_ttl_seconds', value)}
          type="number"
        />
        <FormField
          label="Metrics TTL (seconds)"
          value={draft.cache.metrics_ttl_seconds}
          onChange={(value) => update('cache', 'metrics_ttl_seconds', value)}
          type="number"
        />
      </FormSection>

      <FormSection title="Map Settings" icon={MapPin} iconColor="text-sky-500" iconBg="bg-sky-50 dark:bg-sky-500/10">
        <FormField
          label="Default View"
          value={draft.map.default_view}
          onChange={(value) => update('map', 'default_view', value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Default Zoom"
            value={draft.map.default_zoom}
            onChange={(value) => update('map', 'default_zoom', value)}
            type="number"
          />
          <FormField
            label="Min Zoom"
            value={draft.map.min_zoom}
            onChange={(value) => update('map', 'min_zoom', value)}
            type="number"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Max Zoom"
            value={draft.map.max_zoom}
            onChange={(value) => update('map', 'max_zoom', value)}
            type="number"
          />
          <FormToggle
            label="Zoom Controls"
            checked={draft.map.zoom_controls}
            onChange={(value) => update('map', 'zoom_controls', value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Center Latitude"
            value={draft.map.center_lat}
            onChange={(value) => update('map', 'center_lat', value)}
            type="number"
          />
          <FormField
            label="Center Longitude"
            value={draft.map.center_lon}
            onChange={(value) => update('map', 'center_lon', value)}
            type="number"
          />
        </div>
      </FormSection>

      <FormSection title="Features" icon={Zap} iconColor="text-brand-500" iconBg="bg-brand-50 dark:bg-brand-500/10">
        <FormToggle
          label="Notifications"
          description="Enable in-app notifications"
          checked={draft.features.notifications}
          onChange={(value) => update('features', 'notifications', value)}
        />
        <FormField
          label="Max Visible Notifications"
          value={draft.features.notifications_max_visible}
          onChange={(value) => update('features', 'notifications_max_visible', value)}
          type="number"
        />
        <FormToggle
          label="Playlist Mode"
          description="Auto-rotate between views"
          checked={draft.features.playlist}
          onChange={(value) => update('features', 'playlist', value)}
        />
        <FormToggle
          label="Offline Mode"
          description="Allow offline operation"
          checked={draft.features.offline}
          onChange={(value) => update('features', 'offline', value)}
        />
        <FormToggle
          label="Demo Mode"
          description="Enable demonstration mode — uses the Simulator plugin as the data source"
          checked={draft.features.demo}
          onChange={(value) => update('features', 'demo', value)}
        />
      </FormSection>
    </div>
  );
};
