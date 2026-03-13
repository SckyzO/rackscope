import React from 'react';
import { Info, FolderOpen, RefreshCw, Database } from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { TooltipHelp } from '@app/components/ui/Tooltip';
import { StepperInput } from '@app/components/forms/StepperInput';
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
        description="Name and description shown in the header and browser tab."
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
        description="Filesystem paths to configuration directories (relative to project root)."
        icon={FolderOpen}
        iconColor="text-amber-500"
        iconBg="bg-amber-50 dark:bg-amber-500/10"
      >
        <FormField
          label="Topology Path"
          tooltip="Path to the topology YAML files. For profiles: use a relative path like 'topology' (resolved from the app.yaml directory). For global config: use a full path like 'config/examples/hpc-cluster/topology'."
          value={draft.paths.topology}
          onChange={(value) => update('paths', 'topology', value)}
          placeholder="topology  (or config/examples/hpc-cluster/topology)"
        />
        <FormField
          label="Templates Path"
          tooltip="Directory containing device and rack template YAML files. For profiles: relative path like 'templates'. For global: full path."
          value={draft.paths.templates}
          onChange={(value) => update('paths', 'templates', value)}
          placeholder="templates  (or config/examples/hpc-cluster/templates)"
        />
        <FormField
          label="Checks Path"
          tooltip="Directory containing health check library YAML files. For profiles: relative path like 'checks/library'. For global: full path."
          value={draft.paths.checks}
          onChange={(value) => update('paths', 'checks', value)}
          placeholder="checks/library  (or config/examples/hpc-cluster/checks/library)"
        />
        <FormField
          label="Metrics Path"
          tooltip="Directory containing metrics library YAML files. For profiles: relative path like 'metrics/library'. For global: full path."
          value={draft.paths.metrics}
          onChange={(value) => update('paths', 'metrics', value)}
          placeholder="metrics/library  (or config/examples/hpc-cluster/metrics/library)"
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
            <TooltipHelp text="How often room health states are re-fetched from Prometheus. Lower = more responsive; higher = less load. Min 10s." />
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
            <TooltipHelp text="How often rack detail views re-fetch health states from Prometheus. Min 10s." />
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
            <TooltipHelp text="Generic cache TTL for queries not covered by the specific TTLs below. Kept for backward compatibility." />
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
            <TooltipHelp text="How long health check results are cached. Failures appear within this window. Lower = more reactive, higher = less Prometheus load." />
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
            <TooltipHelp text="Cache lifetime for metric chart data (temperature, power, PDU). Charts don't need sub-minute refresh, so a longer value is fine." />
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
