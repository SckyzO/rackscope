import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Play, Trash2, Plus, RefreshCw, FlaskConical, Cpu } from 'lucide-react';
import { api } from '../../../services/api';
import type { SimulatorScenario, SimulatorOverride } from '../../../types';
import { FormField } from '../common/FormField';
import { FormToggle } from '../common/FormToggle';
import { FormSelect } from '../common/FormSelect';
import type { ConfigDraft } from '../useSettingsConfig';

interface PluginsSettingsSectionProps {
  draft: ConfigDraft;
  setDraft: React.Dispatch<React.SetStateAction<ConfigDraft | null>>;
}

export const PluginsSettingsSection: React.FC<PluginsSettingsSectionProps> = ({
  draft,
  setDraft,
}) => {
  const [simulatorSettingsOpen, setSimulatorSettingsOpen] = useState(false);
  const [slurmSettingsOpen, setSlurmSettingsOpen] = useState(false);

  // Metrics files for catalog path dropdown
  const [metricsFiles, setMetricsFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [metricsFilesLoading, setMetricsFilesLoading] = useState(false);

  useEffect(() => {
    setMetricsFilesLoading(true);
    api.getMetricsFiles()
      .then((data) => setMetricsFiles(data.files ?? []))
      .catch(() => undefined)
      .finally(() => setMetricsFilesLoading(false));
  }, []);

  // Simulator control panel state
  const [scenarios, setScenarios] = useState<SimulatorScenario[]>([]);
  const [overrides, setOverrides] = useState<SimulatorOverride[]>([]);
  const [activeScenario, setActiveScenario] = useState('');
  const [applying, setApplying] = useState(false);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newOverride, setNewOverride] = useState({ instance: '', metric: 'up', value: '0' });

  const loadSimulatorData = useCallback(async () => {
    try {
      const [scenariosData, overridesData, config] = await Promise.all([
        api.getSimulatorScenarios(),
        api.getSimulatorOverrides(),
        api.getConfig(),
      ]);
      setScenarios(scenariosData.scenarios ?? []);
      setOverrides(overridesData.overrides ?? []);
      setActiveScenario(config.plugins?.simulator?.scenario ?? '');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadSimulatorData();
  }, [loadSimulatorData]);

  const handleApplyScenario = async () => {
    if (!draft.plugins.simulator.scenario || applying) return;
    setApplying(true);
    try {
      const config = await api.getConfig();
      await api.updateConfig({
        ...config,
        plugins: {
          ...config.plugins,
          simulator: { ...config.plugins.simulator, scenario: draft.plugins.simulator.scenario },
        },
      });
      await api.restartBackend().catch(() => { /* noop */ });
      setActiveScenario(draft.plugins.simulator.scenario);
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      /* ignore */
    } finally {
      setApplying(false);
    }
  };

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
    } catch {
      /* ignore */
    }
  };

  const updateSimulator = (
    field: string,
    value: string | boolean | Record<string, string> | Array<unknown>
  ) => {
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

  const updateSlurm = (
    field: string,
    value: string | boolean | Record<string, string> | Array<unknown>
  ) => {
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

  const moveSlurmStatus = (
    status: string,
    fromSeverity: 'ok' | 'warn' | 'crit' | 'info' | null,
    toSeverity: 'ok' | 'warn' | 'crit' | 'info'
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;

      const newStatusMap = { ...prev.plugins.slurm.status_map };

      // Remove from source severity if it exists
      if (fromSeverity) {
        newStatusMap[fromSeverity] = newStatusMap[fromSeverity].filter((s) => s !== status);
      }

      // Add to target severity if not already there
      if (!newStatusMap[toSeverity].includes(status)) {
        newStatusMap[toSeverity] = [...newStatusMap[toSeverity], status];
      }

      return {
        ...prev,
        plugins: {
          ...prev.plugins,
          slurm: {
            ...prev.plugins.slurm,
            status_map: newStatusMap,
          },
        },
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Global Warning */}
      <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
        <h4 className="mb-2 font-mono text-xs font-bold tracking-wider text-orange-400 uppercase">
          Backend Restart Required
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Enabling or disabling plugins requires a backend restart to take effect. Run{' '}
          <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-200">make restart</code> or{' '}
          <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-200">
            docker compose restart backend
          </code>{' '}
          after saving.
        </p>
      </div>

      {/* Simulator Plugin */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
            <FlaskConical className="h-4 w-4 text-amber-500" />
          </div>
          <div className="pt-0.5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Simulator Plugin
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Metrics simulator for testing without real hardware
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            <strong>Note:</strong> The simulator only works when using{' '}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-200">
              docker-compose-dev.yaml
            </code>
            . Make sure to start the stack with{' '}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-200">make up</code> or{' '}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-200">
              docker compose up -d
            </code>
            .
          </p>
        </div>

        <FormToggle
          label="Enable Simulator"
          description="Activate simulator plugin for demo mode"
          checked={draft.plugins.simulator.enabled}
          onChange={(value) => updateSimulator('enabled', value)}
        />

        <button
          type="button"
          onClick={() => setSimulatorSettingsOpen(!simulatorSettingsOpen)}
          disabled={!draft.plugins.simulator.enabled}
          className={`mt-4 flex items-center gap-2 text-sm font-medium transition ${
            draft.plugins.simulator.enabled
              ? 'cursor-pointer text-gray-500 dark:text-gray-400'
              : 'cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500'
          }`}
        >
          {simulatorSettingsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced Settings
        </button>

        {simulatorSettingsOpen && draft.plugins.simulator.enabled && (
          <div className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
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
            {/* Scenario — dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                Scenario
                {activeScenario && (
                  <span className="ml-2 font-mono normal-case text-brand-500">
                    (active: {activeScenario})
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <select
                  value={draft.plugins.simulator.scenario}
                  onChange={(e) => updateSimulator('scenario', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {scenarios.length === 0 && (
                    <option value={draft.plugins.simulator.scenario}>
                      {draft.plugins.simulator.scenario || 'Loading...'}
                    </option>
                  )}
                  {scenarios.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} — {s.description}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleApplyScenario}
                  disabled={draft.plugins.simulator.scenario === activeScenario || applying}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold uppercase text-white transition hover:bg-brand-600 disabled:opacity-40"
                >
                  {applying ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {applying ? 'Applying...' : 'Apply'}
                </button>
              </div>
              {draft.plugins.simulator.scenario !== activeScenario && (
                <p className="text-xs text-yellow-500">Apply will restart the backend</p>
              )}
            </div>

            <FormField
              label="Scale Factor"
              value={draft.plugins.simulator.scale_factor}
              onChange={(value) => updateSimulator('scale_factor', value)}
              type="number"
            />

            {/* Incident Rates */}
            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                Incident Rates (0.0 - 1.0)
              </label>
              <FormField
                label="Node Micro Failure"
                value={draft.plugins.simulator.incident_rates.node_micro_failure}
                onChange={(value) =>
                  updateSimulator('incident_rates', {
                    ...draft.plugins.simulator.incident_rates,
                    node_micro_failure: value,
                  })
                }
                type="number"
              />
              <FormField
                label="Rack Macro Failure"
                value={draft.plugins.simulator.incident_rates.rack_macro_failure}
                onChange={(value) =>
                  updateSimulator('incident_rates', {
                    ...draft.plugins.simulator.incident_rates,
                    rack_macro_failure: value,
                  })
                }
                type="number"
              />
              <FormField
                label="Aisle Cooling Failure"
                value={draft.plugins.simulator.incident_rates.aisle_cooling_failure}
                onChange={(value) =>
                  updateSimulator('incident_rates', {
                    ...draft.plugins.simulator.incident_rates,
                    aisle_cooling_failure: value,
                  })
                }
                type="number"
              />
            </div>

            {/* Incident Durations */}
            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                Incident Durations (seconds)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Rack"
                  value={draft.plugins.simulator.incident_durations.rack}
                  onChange={(value) =>
                    updateSimulator('incident_durations', {
                      ...draft.plugins.simulator.incident_durations,
                      rack: value,
                    })
                  }
                  type="number"
                />
                <FormField
                  label="Aisle"
                  value={draft.plugins.simulator.incident_durations.aisle}
                  onChange={(value) =>
                    updateSimulator('incident_durations', {
                      ...draft.plugins.simulator.incident_durations,
                      aisle: value,
                    })
                  }
                  type="number"
                />
              </div>
            </div>

            <FormField
              label="Overrides Path"
              value={draft.plugins.simulator.overrides_path}
              onChange={(value) => updateSimulator('overrides_path', value)}
              placeholder="config/plugins/simulator/overrides.yaml"
            />
            <FormField
              label="Default TTL (seconds)"
              value={draft.plugins.simulator.default_ttl_seconds}
              onChange={(value) => updateSimulator('default_ttl_seconds', value)}
              type="number"
            />
            <FormSelect
              label="Metrics Catalog Path"
              tooltip="YAML file used as the metrics catalog (files starting with metrics_)"
              value={draft.plugins.simulator.metrics_catalog_path ?? ''}
              onChange={(value) => updateSimulator('metrics_catalog_path', value)}
              loading={metricsFilesLoading}
              placeholder="— Select a metrics file —"
              options={metricsFiles.map((f) => ({ value: f.path, label: f.name }))}
            />

            {/* Metrics Catalogs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                Metrics Catalogs (Multi-file support)
              </label>
              <div className="space-y-2">
                {draft.plugins.simulator.metrics_catalogs.map((catalog, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <FormToggle
                      label=""
                      checked={catalog.enabled}
                      onChange={(value) => {
                        const newCatalogs = [...draft.plugins.simulator.metrics_catalogs];
                        newCatalogs[index].enabled = value;
                        updateSimulator('metrics_catalogs', newCatalogs);
                      }}
                    />
                    <FormField
                      label="ID"
                      value={catalog.id}
                      onChange={(value) => {
                        const newCatalogs = [...draft.plugins.simulator.metrics_catalogs];
                        newCatalogs[index].id = value;
                        updateSimulator('metrics_catalogs', newCatalogs);
                      }}
                    />
                    <FormField
                      label="Path"
                      value={catalog.path}
                      onChange={(value) => {
                        const newCatalogs = [...draft.plugins.simulator.metrics_catalogs];
                        newCatalogs[index].path = value;
                        updateSimulator('metrics_catalogs', newCatalogs);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newCatalogs = draft.plugins.simulator.metrics_catalogs.filter(
                          (_, i) => i !== index
                        );
                        updateSimulator('metrics_catalogs', newCatalogs);
                      }}
                      className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white uppercase hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newCatalogs = [
                      ...draft.plugins.simulator.metrics_catalogs,
                      { id: '', path: '', enabled: true },
                    ];
                    updateSimulator('metrics_catalogs', newCatalogs);
                  }}
                  className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white uppercase hover:bg-blue-700"
                >
                  Add Catalog
                </button>
              </div>
            </div>

            {/* ── Metric Overrides ── */}
            <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                  Metric Overrides
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={loadSimulatorData}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </button>
                  {overrides.length > 0 && (
                    <button
                      onClick={() =>
                        api
                          .clearSimulatorOverrides()
                          .then(loadSimulatorData)
                          .catch(() => { /* noop */ })
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/50 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" /> Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddOverride((p) => !p)}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand-600"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
              </div>

              {showAddOverride && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <input
                    type="text"
                    value={newOverride.instance}
                    onChange={(e) => setNewOverride((p) => ({ ...p, instance: e.target.value }))}
                    placeholder="Instance (e.g. compute001)"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newOverride.metric}
                      onChange={(e) => setNewOverride((p) => ({ ...p, metric: e.target.value }))}
                      placeholder="Metric (e.g. up)"
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    />
                    <input
                      type="number"
                      value={newOverride.value}
                      onChange={(e) => setNewOverride((p) => ({ ...p, value: e.target.value }))}
                      placeholder="Value"
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddOverride}
                      className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold uppercase text-white hover:bg-green-600"
                    >
                      Add Override
                    </button>
                    <button
                      onClick={() => setShowAddOverride(false)}
                      className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-bold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {overrides.length === 0 ? (
                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                  No active overrides
                </p>
              ) : (
                <div className="space-y-1.5">
                  {overrides.map((ov) => (
                    <div
                      key={ov.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50"
                    >
                      <span className="font-mono text-xs">
                        <span className="text-brand-500">
                          {ov.instance ?? ov.rack_id}
                        </span>
                        <span className="mx-1.5 text-gray-400 dark:text-gray-500">
                          →
                        </span>
                        <span className="text-amber-500">{ov.metric}</span>
                        <span className="mx-1.5 text-gray-400 dark:text-gray-500">
                          =
                        </span>
                        <span className="text-gray-800 dark:text-white/90">{ov.value}</span>
                      </span>
                      <button
                        onClick={() =>
                          api
                            .deleteSimulatorOverride(ov.id)
                            .then(loadSimulatorData)
                            .catch(() => { /* noop */ })
                        }
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slurm Plugin */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
            <Cpu className="h-4 w-4 text-blue-500" />
          </div>
          <div className="pt-0.5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Slurm Plugin
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Workload manager integration for HPC clusters
            </p>
          </div>
        </div>

        <FormToggle
          label="Enable Slurm Integration"
          description="Activate Slurm plugin for HPC views"
          checked={draft.plugins.slurm.enabled}
          onChange={(value) => updateSlurm('enabled', value)}
        />

        <button
          type="button"
          onClick={() => setSlurmSettingsOpen(!slurmSettingsOpen)}
          disabled={!draft.plugins.slurm.enabled}
          className={`mt-4 flex items-center gap-2 text-sm font-medium transition ${
            draft.plugins.slurm.enabled
              ? 'cursor-pointer text-gray-500 dark:text-gray-400'
              : 'cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500'
          }`}
        >
          {slurmSettingsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced Settings
        </button>

        {slurmSettingsOpen && draft.plugins.slurm.enabled && (
          <div className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
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

            {/* Roles */}
            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                Roles (filter by device role)
              </label>
              <div className="space-y-2">
                {draft.plugins.slurm.roles.map((role, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <FormField
                      label=""
                      value={role}
                      onChange={(value) => {
                        const newRoles = [...draft.plugins.slurm.roles];
                        newRoles[index] = value;
                        updateSlurm('roles', newRoles);
                      }}
                      placeholder="compute, visu, login, etc."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newRoles = draft.plugins.slurm.roles.filter((_, i) => i !== index);
                        updateSlurm('roles', newRoles);
                      }}
                      className="rounded bg-red-600 px-3 py-2 text-xs font-bold text-white uppercase hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newRoles = [...draft.plugins.slurm.roles, ''];
                    updateSlurm('roles', newRoles);
                  }}
                  className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white uppercase hover:bg-blue-700"
                >
                  Add Role
                </button>
              </div>
            </div>

            <FormToggle
              label="Include Unlabeled Nodes"
              description="Include nodes without role labels in Slurm views"
              checked={draft.plugins.slurm.include_unlabeled}
              onChange={(value) => updateSlurm('include_unlabeled', value)}
            />

            {/* Severity Colors */}
            <div className="space-y-3">
              <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                Severity Colors
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <label className="min-w-[60px] text-xs text-gray-400 dark:text-gray-500">
                    OK
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.ok}
                    onChange={(e) => updateSlurmColor('ok', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-gray-200 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.ok}
                    onChange={(e) => updateSlurmColor('ok', e.target.value)}
                    className="w-24 rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="min-w-[60px] text-xs text-gray-400 dark:text-gray-500">
                    WARN
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.warn}
                    onChange={(e) => updateSlurmColor('warn', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-gray-200 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.warn}
                    onChange={(e) => updateSlurmColor('warn', e.target.value)}
                    className="w-24 rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="min-w-[60px] text-xs text-gray-400 dark:text-gray-500">
                    CRIT
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.crit}
                    onChange={(e) => updateSlurmColor('crit', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-gray-200 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.crit}
                    onChange={(e) => updateSlurmColor('crit', e.target.value)}
                    className="w-24 rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="min-w-[60px] text-xs text-gray-400 dark:text-gray-500">
                    INFO
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.info}
                    onChange={(e) => updateSlurmColor('info', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-gray-200 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.info}
                    onChange={(e) => updateSlurmColor('info', e.target.value)}
                    className="w-24 rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Status Mapping */}
            <div className="space-y-3">
              <label className="block text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                Status Mapping (Drag &amp; Drop to Reorganize)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(['ok', 'warn', 'crit', 'info'] as const).map((severity) => (
                  <div
                    key={severity}
                    className="rounded-lg border-2 border-dashed p-4 transition"
                    style={{
                      borderColor: draft.plugins.slurm.severity_colors[severity],
                      backgroundColor: 'transparent',
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.opacity = '0.6';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.opacity = '1';
                      const status = e.dataTransfer.getData('status');
                      const fromSeverity = e.dataTransfer.getData('fromSeverity') as
                        | 'ok'
                        | 'warn'
                        | 'crit'
                        | 'info'
                        | null;
                      if (status) {
                        moveSlurmStatus(status, fromSeverity || null, severity);
                      }
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div
                        className="text-xs font-bold tracking-wider uppercase"
                        style={{ color: draft.plugins.slurm.severity_colors[severity] }}
                      >
                        {severity}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {draft.plugins.slurm.status_map[severity].length}
                      </div>
                    </div>
                    <div className="min-h-[100px] space-y-2">
                      {draft.plugins.slurm.status_map[severity].map((status) => (
                        <div
                          key={status}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('status', status);
                            e.dataTransfer.setData('fromSeverity', severity);
                            e.currentTarget.style.opacity = '0.4';
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          className="flex cursor-move items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 transition dark:border-gray-700 dark:bg-gray-900"
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: draft.plugins.slurm.severity_colors[severity],
                          }}
                        >
                          <svg
                            className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8h16M4 16h16"
                            />
                          </svg>
                          <span className="flex-1 font-mono text-xs text-gray-600 dark:text-gray-300">
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Drag and drop statuses between severity zones to reorganize them.
              </p>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 font-mono text-xs font-bold tracking-wider text-blue-400 uppercase">
                Slurm Features
              </h4>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <li>• Wallboard view with compact aisle layout</li>
                <li>• Cluster overview with partition status</li>
                <li>• Node list with topology context</li>
                <li>• Alerts dashboard for WARN/CRIT nodes</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
