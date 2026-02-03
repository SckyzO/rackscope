import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { FormToggle } from '../common/FormToggle';
import type { ConfigDraft } from '../useSettingsConfig';

interface PluginsSettingsSectionProps {
  draft: ConfigDraft;
  setDraft: React.Dispatch<React.SetStateAction<ConfigDraft | null>>;
}

export const PluginsSettingsSection: React.FC<PluginsSettingsSectionProps> = ({
  draft,
  setDraft,
}) => {

  const updateSimulator = (field: string, value: string | boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plugins: {
          ...prev.plugins,
          simulator: {
            ...prev.plugins.simulator,
            [field]: value,
          },
        },
      };
    });
  };

  const updateSlurm = (field: string, value: string | boolean | Record<string, string>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plugins: {
          ...prev.plugins,
          slurm: {
            ...prev.plugins.slurm,
            [field]: value,
          },
        },
      };
    });
  };

  const updateSlurmColor = (severity: 'ok' | 'warn' | 'crit' | 'info', color: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plugins: {
          ...prev.plugins,
          slurm: {
            ...prev.plugins.slurm,
            severity_colors: {
              ...prev.plugins.slurm.severity_colors,
              [severity]: color,
            },
          },
        },
      };
    });
  };

  return (
    <div className="space-y-8">
      {/* Global Warning */}
      <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
        <h4 className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-orange-400">
          ⚠️ Backend Restart Required
        </h4>
        <p className="text-xs text-[var(--color-text-base)]">
          Enabling or disabling plugins requires a backend restart to take effect.
          Run <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs">make restart</code> or{' '}
          <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs">
            docker compose restart backend
          </code>{' '}
          after saving.
        </p>
      </div>

      {/* Simulator Plugin */}
      <FormSection
        title="Simulator Plugin"
        description="Metrics simulator for testing without real hardware"
      >
        <FormToggle
          label="Enable Simulator"
          description="Activate simulator plugin for demo mode"
          checked={draft.plugins.simulator.enabled}
          onChange={(value) => updateSimulator('enabled', value)}
        />

        {draft.plugins.simulator.enabled && (
          <>
            <FormField
              label="Update Interval (seconds)"
              value={draft.plugins.simulator.update_interval_seconds}
              onChange={(value) => updateSimulator('update_interval_seconds', value)}
              type="number"
            />
            <FormField
              label="Random Seed (optional)"
              value={draft.plugins.simulator.seed}
              onChange={(value) => updateSimulator('seed', value)}
              placeholder="Leave empty for random"
            />

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-blue-400">
                Simulator Control Panel
              </h4>
              <p className="text-xs text-[var(--color-text-base)] mb-3">
                Manage test scenarios and metric overrides from the dedicated control panel.
              </p>
              <Link
                to="/simulator"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold uppercase transition"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-text-inverse)' }}
              >
                <ExternalLink className="h-4 w-4" />
                Open Control Panel
              </Link>
            </div>
          </>
        )}
      </FormSection>

      {/* Slurm Plugin */}
      <FormSection
        title="Slurm Plugin"
        description="Workload manager integration for HPC clusters"
      >
        <FormToggle
          label="Enable Slurm Integration"
          description="Activate Slurm plugin for HPC views"
          checked={draft.plugins.slurm.enabled}
          onChange={(value) => updateSlurm('enabled', value)}
        />

        {draft.plugins.slurm.enabled && (
          <>
            <FormField
              label="Metric Name"
              value={draft.plugins.slurm.metric}
              onChange={(value) => updateSlurm('metric', value)}
              placeholder="slurm_node_status"
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Node Label"
                value={draft.plugins.slurm.label_node}
                onChange={(value) => updateSlurm('label_node', value)}
                placeholder="node"
              />
              <FormField
                label="Status Label"
                value={draft.plugins.slurm.label_status}
                onChange={(value) => updateSlurm('label_status', value)}
                placeholder="status"
              />
            </div>
            <FormField
              label="Partition Label"
              value={draft.plugins.slurm.label_partition}
              onChange={(value) => updateSlurm('label_partition', value)}
              placeholder="partition"
            />
            <FormField
              label="Node Mapping File (optional)"
              value={draft.plugins.slurm.mapping_path}
              onChange={(value) => updateSlurm('mapping_path', value)}
              placeholder="config/plugins/slurm/node_mapping.yaml"
            />

            {/* Severity Colors */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                Severity Colors
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs" style={{ color: 'var(--color-text-muted)', minWidth: '60px' }}>
                    OK
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.ok}
                    onChange={(e) => updateSlurmColor('ok', e.target.value)}
                    className="h-10 w-full rounded border border-[var(--color-border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.ok}
                    onChange={(e) => updateSlurmColor('ok', e.target.value)}
                    className="w-24 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-base)' }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs" style={{ color: 'var(--color-text-muted)', minWidth: '60px' }}>
                    WARN
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.warn}
                    onChange={(e) => updateSlurmColor('warn', e.target.value)}
                    className="h-10 w-full rounded border border-[var(--color-border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.warn}
                    onChange={(e) => updateSlurmColor('warn', e.target.value)}
                    className="w-24 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-base)' }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs" style={{ color: 'var(--color-text-muted)', minWidth: '60px' }}>
                    CRIT
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.crit}
                    onChange={(e) => updateSlurmColor('crit', e.target.value)}
                    className="h-10 w-full rounded border border-[var(--color-border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.crit}
                    onChange={(e) => updateSlurmColor('crit', e.target.value)}
                    className="w-24 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-base)' }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs" style={{ color: 'var(--color-text-muted)', minWidth: '60px' }}>
                    INFO
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.info}
                    onChange={(e) => updateSlurmColor('info', e.target.value)}
                    className="h-10 w-full rounded border border-[var(--color-border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.info}
                    onChange={(e) => updateSlurmColor('info', e.target.value)}
                    className="w-24 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-base)' }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-blue-400">
                Slurm Features
              </h4>
              <ul className="space-y-2 text-xs text-[var(--color-text-base)]">
                <li>• Wallboard view with compact aisle layout</li>
                <li>• Cluster overview with partition status</li>
                <li>• Node list with topology context</li>
                <li>• Alerts dashboard for WARN/CRIT nodes</li>
              </ul>
            </div>
          </>
        )}
      </FormSection>
    </div>
  );
};
