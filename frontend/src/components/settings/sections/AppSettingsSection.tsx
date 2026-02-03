import React from 'react';
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
    <div className="space-y-8">
      <FormSection title="Application Info">
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

      <FormSection title="Paths">
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
      </FormSection>

      <FormSection title="Refresh Intervals" description="UI refresh intervals in seconds">
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

      <FormSection title="Cache" description="Prometheus query cache TTL">
        <FormField
          label="TTL (seconds)"
          value={draft.cache.ttl_seconds}
          onChange={(value) => update('cache', 'ttl_seconds', value)}
          type="number"
        />
      </FormSection>

      <FormSection title="Map Settings">
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

      <FormSection title="Features">
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
      </FormSection>
    </div>
  );
};
