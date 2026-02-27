import React from 'react';
import { Info, FolderOpen, RefreshCw, Database, Zap, Bell } from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { FormToggle } from '../common/FormToggle';
import { FormSelect } from '../common/FormSelect';
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
          tooltip="Display name shown in the browser tab and dashboard header."
          value={draft.app.name}
          onChange={(value) => update('app', 'name', value)}
        />
        <FormField
          label="Description"
          tooltip="Short description of this Rackscope instance, displayed in the UI."
          value={draft.app.description}
          onChange={(value) => update('app', 'description', value)}
        />
      </FormSection>

      <FormSection title="Paths" icon={FolderOpen} iconColor="text-amber-500" iconBg="bg-amber-50 dark:bg-amber-500/10">
        <FormField
          label="Topology Path"
          tooltip="Path to the topology YAML files (sites, rooms, racks). Relative to the project root."
          value={draft.paths.topology}
          onChange={(value) => update('paths', 'topology', value)}
          placeholder="config/topology"
        />
        <FormField
          label="Templates Path"
          tooltip="Directory containing device and rack template YAML files."
          value={draft.paths.templates}
          onChange={(value) => update('paths', 'templates', value)}
          placeholder="config/templates"
        />
        <FormField
          label="Checks Path"
          tooltip="Directory containing health check library YAML files."
          value={draft.paths.checks}
          onChange={(value) => update('paths', 'checks', value)}
          placeholder="config/checks"
        />
        <FormField
          label="Metrics Path"
          tooltip="Directory containing metrics library YAML files."
          value={draft.paths.metrics}
          onChange={(value) => update('paths', 'metrics', value)}
          placeholder="config/metrics/library"
        />
      </FormSection>

      <FormSection title="Refresh Intervals" description="UI refresh intervals in seconds" icon={RefreshCw} iconColor="text-green-500" iconBg="bg-green-50 dark:bg-green-500/10">
        <FormField
          label="Room State Refresh (seconds)"
          tooltip="How often the backend refreshes room health states. Lower = more responsive but more Prometheus load. Default: 60."
          value={draft.refresh.room_state_seconds}
          onChange={(value) => update('refresh', 'room_state_seconds', value)}
          type="number"
        />
        <FormField
          label="Rack State Refresh (seconds)"
          tooltip="How often rack details are refreshed. Default: 60."
          value={draft.refresh.rack_state_seconds}
          onChange={(value) => update('refresh', 'rack_state_seconds', value)}
          type="number"
        />
      </FormSection>

      <FormSection title="Cache" description="Prometheus query cache TTL (two-level caching)" icon={Database} iconColor="text-purple-500" iconBg="bg-purple-50 dark:bg-purple-500/10">
        <FormField
          label="Legacy TTL (seconds)"
          tooltip="Deprecated cache TTL kept for backward compatibility."
          value={draft.cache.ttl_seconds}
          onChange={(value) => update('cache', 'ttl_seconds', value)}
          type="number"
        />
        <FormField
          label="Health Checks TTL (seconds)"
          tooltip="Cache duration for health check results from Prometheus. Default: 30."
          value={draft.cache.health_checks_ttl_seconds}
          onChange={(value) => update('cache', 'health_checks_ttl_seconds', value)}
          type="number"
        />
        <FormField
          label="Metrics TTL (seconds)"
          tooltip="Cache duration for detailed metrics (temperature, power). Higher values reduce Prometheus load. Default: 120."
          value={draft.cache.metrics_ttl_seconds}
          onChange={(value) => update('cache', 'metrics_ttl_seconds', value)}
          type="number"
        />
      </FormSection>

      <FormSection title="Notifications" icon={Bell} iconColor="text-sky-500" iconBg="bg-sky-50 dark:bg-sky-500/10" description="Configure alert toast popups (WARN/CRIT)">
        <FormSelect
          label="Toast position"
          tooltip="Where alert toast popups appear on screen."
          value={draft.features.toast_position}
          onChange={(value) => update('features', 'toast_position', value)}
          options={[
            { value: 'bottom-right', label: 'Bottom right' },
            { value: 'top-right', label: 'Top right' },
          ]}
        />
        <FormField
          label="Display duration (seconds)"
          tooltip="How long WARN/CRIT toasts stay visible before auto-dismissing. Default: 15."
          value={draft.features.toast_duration_seconds}
          onChange={(value) => update('features', 'toast_duration_seconds', value)}
          type="number"
        />
        <FormField
          label="Stack threshold"
          tooltip="When more than N toasts appear at once, they collapse into a stacked view with a count indicator. Set to 0 to disable stacking."
          value={draft.features.toast_stack_threshold}
          onChange={(value) => update('features', 'toast_stack_threshold', value)}
          type="number"
        />
      </FormSection>

      {/* Features — at the bottom of General */}
      <FormSection title="Features" icon={Zap} iconColor="text-brand-500" iconBg="bg-brand-50 dark:bg-brand-500/10">
        <FormToggle
          label="Demo Mode"
          description="Enables demo/test data from the Simulator plugin. The Simulator must also be enabled and configured in the Plugins tab — this toggle alone is not sufficient."
          checked={draft.features.demo}
          onChange={(value) => update('features', 'demo', value)}
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-600">
          Page visibility and playlist are in the <strong>Views</strong> tab. Plugin configuration is in <strong>Plugins</strong>.
        </p>
      </FormSection>
    </div>
  );
};
