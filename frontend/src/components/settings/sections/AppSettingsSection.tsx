import React from 'react';
import { Info, FolderOpen, RefreshCw, Database } from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { StepperInput } from '../../../app/components/forms/StepperInput';
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
      <FormSection
        title="Application Info"
        icon={Info}
        iconColor="text-brand-500"
        iconBg="bg-brand-50 dark:bg-brand-500/10"
      >
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

      <FormSection
        title="Paths"
        icon={FolderOpen}
        iconColor="text-amber-500"
        iconBg="bg-amber-50 dark:bg-amber-500/10"
      >
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

      <FormSection
        title="Backend refresh intervals"
        description="How often the server re-queries Prometheus for room and rack state (app.yaml)"
        icon={RefreshCw}
        iconColor="text-green-500"
        iconBg="bg-green-50 dark:bg-green-500/10"
      >
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Room State Refresh (seconds)
          </label>
          <StepperInput
            value={Number(draft.refresh.room_state_seconds)}
            onChange={(v) => update('refresh', 'room_state_seconds', String(v))}
            min={5}
            max={3600}
            step={5}
            unit="s"
            className="w-32"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Rack State Refresh (seconds)
          </label>
          <StepperInput
            value={Number(draft.refresh.rack_state_seconds)}
            onChange={(v) => update('refresh', 'rack_state_seconds', String(v))}
            min={5}
            max={3600}
            step={5}
            unit="s"
            className="w-32"
          />
        </div>
      </FormSection>

      <FormSection
        title="Cache"
        description="Prometheus query cache TTL (two-level caching)"
        icon={Database}
        iconColor="text-purple-500"
        iconBg="bg-purple-50 dark:bg-purple-500/10"
      >
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Legacy TTL (seconds)
          </label>
          <StepperInput
            value={Number(draft.cache.ttl_seconds)}
            onChange={(v) => update('cache', 'ttl_seconds', String(v))}
            min={5}
            max={3600}
            step={5}
            unit="s"
            className="w-32"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Health Checks TTL (seconds)
          </label>
          <StepperInput
            value={Number(draft.cache.health_checks_ttl_seconds)}
            onChange={(v) => update('cache', 'health_checks_ttl_seconds', String(v))}
            min={5}
            max={3600}
            step={5}
            unit="s"
            className="w-32"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Metrics TTL (seconds)
          </label>
          <StepperInput
            value={Number(draft.cache.metrics_ttl_seconds)}
            onChange={(v) => update('cache', 'metrics_ttl_seconds', String(v))}
            min={5}
            max={3600}
            step={10}
            unit="s"
            className="w-32"
          />
        </div>
      </FormSection>

    </div>
  );
};
