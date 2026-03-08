import React from 'react';
import { Cpu } from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { StepperInput } from '../../../app/components/forms/StepperInput';
import { TooltipHelp } from '../../../app/components/ui/Tooltip';
import type { ConfigDraft } from '../useSettingsConfig';

interface PlannerSettingsSectionProps {
  draft: ConfigDraft;
  setDraft: React.Dispatch<React.SetStateAction<ConfigDraft | null>>;
}

export const PlannerSettingsSection: React.FC<PlannerSettingsSectionProps> = ({
  draft,
  setDraft,
}) => {
  const update = (field: string, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        planner: {
          ...prev.planner,
          [field]: value,
        },
      };
    });
  };

  return (
    <div className="space-y-4">
      <FormSection
        icon={Cpu}
        iconColor="text-indigo-500"
        iconBg="bg-indigo-50 dark:bg-indigo-500/10"
        title="Query Planner"
        description="Configures how health checks are batched and cached"
      >
        <FormField
          label="Unknown State Value"
          tooltip="Health state returned when no Prometheus data is available for a node. Options: OK, WARN, CRIT, UNKNOWN."
          value={draft.planner.unknown_state}
          onChange={(value) => update('unknown_state', value)}
          placeholder="UNKNOWN"
        />
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Cache TTL (seconds)
            <TooltipHelp text="How long batched health check snapshots are cached before re-querying Prometheus. Increase for large topologies." />
          </label>
          <StepperInput
            value={Number(draft.planner.cache_ttl_seconds)}
            onChange={(v) => update('cache_ttl_seconds', String(v))}
            min={5}
            max={3600}
            step={5}
            unit="s"
            className="w-32"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Max IDs per Query
            <TooltipHelp text="Maximum number of node or rack IDs grouped into a single PromQL query. Reduce if Prometheus returns query-too-large errors." />
          </label>
          <StepperInput
            value={Number(draft.planner.max_ids_per_query)}
            onChange={(v) => update('max_ids_per_query', String(v))}
            min={10}
            max={1000}
            step={10}
            className="w-32"
          />
        </div>
      </FormSection>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <h4 className="mb-2 font-mono text-xs font-bold tracking-wider text-blue-400 uppercase">
          Performance Tips
        </h4>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <li>
            • Increase <strong>Cache TTL</strong> to reduce Prometheus load
          </li>
          <li>
            • Increase <strong>Max IDs</strong> to batch more queries together
          </li>
          <li>• Match Cache TTL with UI refresh intervals for best UX</li>
        </ul>
      </div>
    </div>
  );
};
