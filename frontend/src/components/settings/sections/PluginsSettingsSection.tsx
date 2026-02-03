import React, { useState, useEffect, useCallback } from 'react';
import { Play, Trash2, Plus } from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { FormToggle } from '../common/FormToggle';
import { api } from '../../../services/api';
import type { ConfigDraft } from '../useSettingsConfig';
import type { SimulatorScenario, SimulatorOverride } from '../../../types';

interface PluginsSettingsSectionProps {
  draft: ConfigDraft;
  setDraft: React.Dispatch<React.SetStateAction<ConfigDraft | null>>;
}

export const PluginsSettingsSection: React.FC<PluginsSettingsSectionProps> = ({
  draft,
  setDraft,
}) => {
  const [scenarios, setScenarios] = useState<SimulatorScenario[]>([]);
  const [overrides, setOverrides] = useState<SimulatorOverride[]>([]);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newOverride, setNewOverride] = useState({
    instance: '',
    metric: 'up',
    value: '0',
  });

  const loadSimulatorData = useCallback(async () => {
    try {
      const [scenariosData, overridesData] = await Promise.all([
        api.getSimulatorScenarios(),
        api.getSimulatorOverrides(),
      ]);
      setScenarios(scenariosData.scenarios || []);
      setOverrides(overridesData.overrides || []);
    } catch (err) {
      console.error('Failed to load simulator data:', err);
    }
  }, []);

  useEffect(() => {
    if (draft.plugins.simulator.enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadSimulatorData();
    }
  }, [draft.plugins.simulator.enabled, loadSimulatorData]);

  const handleAddOverride = async () => {
    try {
      await api.addSimulatorOverride({
        instance: newOverride.instance || null,
        rack_id: null,
        metric: newOverride.metric,
        value: parseFloat(newOverride.value),
        ttl_seconds: 0,
      });
      await loadSimulatorData();
      setShowAddOverride(false);
      setNewOverride({ instance: '', metric: 'up', value: '0' });
    } catch (err) {
      console.error('Failed to add override:', err);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      await api.deleteSimulatorOverride(overrideId);
      await loadSimulatorData();
    } catch (err) {
      console.error('Failed to delete override:', err);
    }
  };

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

  const updateSlurm = (field: string, value: string | boolean) => {
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

            {/* Scenario Selection */}
            {scenarios.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Active Scenario
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {scenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => {
                        // TODO: Update scenario via API
                        console.log('Switch to scenario:', scenario.id);
                      }}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-left transition hover:border-blue-500"
                    >
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-[var(--color-text-muted)]" />
                        <div>
                          <div className="text-sm font-bold text-[var(--color-text-primary)]">{scenario.name}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">{scenario.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Overrides Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Metric Overrides
                </label>
                <button
                  onClick={() => setShowAddOverride(!showAddOverride)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold uppercase text-[var(--color-text-primary)] hover:bg-blue-700"
                >
                  <Plus className="h-3 w-3" />
                  Add Override
                </button>
              </div>

              {showAddOverride && (
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-3">
                  <FormField
                    label="Instance (node name)"
                    value={newOverride.instance}
                    onChange={(value) =>
                      setNewOverride((prev) => ({ ...prev, instance: value }))
                    }
                    placeholder="compute001"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      label="Metric"
                      value={newOverride.metric}
                      onChange={(value) => setNewOverride((prev) => ({ ...prev, metric: value }))}
                      placeholder="up"
                    />
                    <FormField
                      label="Value"
                      value={newOverride.value}
                      onChange={(value) => setNewOverride((prev) => ({ ...prev, value: value }))}
                      type="number"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddOverride}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold uppercase text-[var(--color-text-primary)] hover:bg-green-700"
                    >
                      Add Override
                    </button>
                    <button
                      onClick={() => setShowAddOverride(false)}
                      className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-sm font-bold uppercase text-[var(--color-text-primary)] hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {overrides.length > 0 && (
                <div className="space-y-2">
                  {overrides.map((override) => (
                    <div
                      key={override.id}
                      className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3"
                    >
                      <div className="font-mono text-sm">
                        <span className="text-blue-400">{override.instance || override.rack_id}</span>
                        <span className="mx-2 text-gray-600">→</span>
                        <span className="text-yellow-400">{override.metric}</span>
                        <span className="mx-2 text-gray-600">=</span>
                        <span className="text-[var(--color-text-primary)]">{override.value}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteOverride(override.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {overrides.length === 0 && !showAddOverride && (
                <div className="text-center text-sm text-[var(--color-text-muted)]">
                  No active overrides. Click "Add Override" to create one.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
              <h4 className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-yellow-400">
                ⚠️ Demo Mode Redundancy
              </h4>
              <p className="text-xs text-[var(--color-text-base)]">
                The <strong>features.demo</strong> setting is currently redundant with this plugin.
                When simulator is enabled, demo mode is automatically active.
              </p>
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
