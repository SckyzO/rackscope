import React from 'react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
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
    <div className="space-y-8">
      <FormSection
        title="Query Planner"
        description="Configures how health checks are batched and cached"
      >
        <FormField
          label="Unknown State Value"
          value={draft.planner.unknown_state}
          onChange={(value) => update('unknown_state', value)}
          placeholder="UNKNOWN"
        />
        <FormField
          label="Cache TTL (seconds)"
          value={draft.planner.cache_ttl_seconds}
          onChange={(value) => update('cache_ttl_seconds', value)}
          type="number"
        />
        <FormField
          label="Max IDs per Query"
          value={draft.planner.max_ids_per_query}
          onChange={(value) => update('max_ids_per_query', value)}
          type="number"
        />
      </FormSection>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <h4 className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-blue-400">
          Performance Tips
        </h4>
        <ul className="space-y-2 text-xs text-gray-300">
          <li>• Increase <strong>Cache TTL</strong> to reduce Prometheus load</li>
          <li>• Increase <strong>Max IDs</strong> to batch more queries together</li>
          <li>• Match Cache TTL with UI refresh intervals for best UX</li>
        </ul>
      </div>
    </div>
  );
};
