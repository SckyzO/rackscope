import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  FlaskConical,
  Cpu,
  X,
  GripVertical,
  Save,
} from 'lucide-react';
import { SettingField } from '../../../app/components/SettingTooltip';
import { api } from '../../../services/api';
import type { SimulatorScenario, SimulatorOverride } from '../../../types';
import { FormField } from '../common/FormField';
import { FormToggle } from '../common/FormToggle';
import { FormSelect } from '../common/FormSelect';
import type { ConfigDraft } from '../useSettingsConfig';

// ── Slurm Node Mapping Editor ─────────────────────────────────────────────────

interface MappingEntry {
  node: string;
  instance: string;
}

const SlurmMappingEditor = ({ mappingPath }: { mappingPath?: string }) => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<MappingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getSlurmMapping();
      setEntries(data.entries ?? []);
    } catch {
      /**/
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    load();
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.saveSlurmMapping(entries);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /**/
    } finally {
      setSaving(false);
    }
  };

  const update = (i: number, field: keyof MappingEntry, val: string) => {
    const next = [...entries];
    next[i] = { ...next[i], [field]: val };
    setEntries(next);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 mt-1 flex items-center gap-1.5 text-xs font-medium"
      >
        <Plus className="h-3.5 w-3.5" />
        Edit mappings
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
            Node mappings
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            Supports wildcards: <span className="font-mono">n*</span> →{' '}
            <span className="font-mono">compute*</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-2 px-1">
            <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">
              Slurm node (pattern)
            </span>
            <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">
              Topology instance
            </span>
          </div>
          {entries.map((e, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input
                value={e.node}
                onChange={(ev) => update(i, 'node', ev.target.value)}
                placeholder="n* or n001"
                className="rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              <div className="flex gap-1">
                <input
                  value={e.instance}
                  onChange={(ev) => update(i, 'instance', ev.target.value)}
                  placeholder="compute* or compute001"
                  className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setEntries(entries.filter((_, j) => j !== i))}
                  className="rounded p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEntries([...entries, { node: '', instance: '' }])}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Add mapping
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
        {!mappingPath && (
          <p className="text-[10px] text-amber-500">Set the mapping file path first</p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !mappingPath}
          className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
            saved
              ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
              : 'bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400'
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

// ── Main section ───────────────────────────────────────────────────────────────

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
  const [roleInput, setRoleInput] = useState('');
  const roleInputRef = useRef<HTMLInputElement>(null);

  // Demo ribbon visibility — localStorage preference, not saved to app.yaml
  const [ribbonVisible, setRibbonVisible] = useState(
    () => localStorage.getItem('rackscope.demo.ribbon') !== 'hidden'
  );
  const ribbonVisibleRef = useRef(ribbonVisible);
  ribbonVisibleRef.current = ribbonVisible;
  const toggleRibbon = (value: boolean) => {
    localStorage.setItem('rackscope.demo.ribbon', value ? 'visible' : 'hidden');
    setRibbonVisible(value);
    window.dispatchEvent(new Event('rackscope-demo-ribbon'));
  };

  // Metrics files for catalog path dropdown
  const [metricsFiles, setMetricsFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [metricsFilesLoading, setMetricsFilesLoading] = useState(false);

  useEffect(() => {
    setMetricsFilesLoading(true);
    api
      .getMetricsFiles()
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

  // Detect if the simulator container is currently responding.
  // When running, the plugin settings are greyed with a restart warning.
  const [simulatorRunning, setSimulatorRunning] = useState(false);

  const loadSimulatorData = useCallback(async () => {
    try {
      const [scenariosData, overridesData, config, status] = await Promise.all([
        api.getSimulatorScenarios(),
        api.getSimulatorOverrides(),
        api.getConfig(),
        api.getSimulatorStatus().catch(() => ({ running: false })),
      ]);
      setScenarios(scenariosData.scenarios ?? []);
      setOverrides(overridesData.overrides ?? []);
      setActiveScenario(config.plugins?.simulator?.scenario ?? '');
      setSimulatorRunning(status?.running ?? false);
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
      await api.restartBackend().catch(() => {
        /* noop */
      });
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
          <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-200">
            make restart
          </code>{' '}
          or{' '}
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

        {simulatorRunning ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2.5">
            <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              <strong>Simulator is currently running.</strong> Configuration changes will take
              effect on next container restart — they won't interrupt the running simulator.
            </p>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              <strong>Note:</strong> The simulator only works when using{' '}
              <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-200">
                docker-compose-dev.yaml
              </code>
              . Make sure to start the stack with{' '}
              <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-200">
                make up
              </code>{' '}
              or{' '}
              <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-gray-200">
                docker compose up -d
              </code>
              .
            </p>
          </div>
        )}

        <div>
          <FormToggle
            label="Enable Simulator"
            description="Activate simulator plugin for demo mode"
            checked={draft.plugins.simulator.enabled}
            onChange={(value) => updateSimulator('enabled', value)}
          />

          {draft.plugins.simulator.enabled && (
            <div className="mt-3">
              <FormToggle
                label="Show DEMO ribbon"
                description="Display the diagonal DEMO ribbon in the top-left corner of the UI"
                checked={ribbonVisible}
                onChange={toggleRibbon}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setSimulatorSettingsOpen(!simulatorSettingsOpen)}
            disabled={!draft.plugins.simulator.enabled}
            className={`mt-4 flex items-center gap-2 text-sm font-medium transition ${
              draft.plugins.simulator.enabled
                ? 'cursor-pointer text-gray-500 dark:text-gray-400'
                : 'cursor-not-allowed text-gray-400 opacity-50 dark:text-gray-500'
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
                <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Scenario
                  {activeScenario && (
                    <span className="text-brand-500 ml-2 font-mono normal-case">
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
                    className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase transition disabled:opacity-40"
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
                <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
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
                <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
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
                <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
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
                  <h4 className="font-mono text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
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
                            .catch(() => {
                              /* noop */
                            })
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-red-500/50 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" /> Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setShowAddOverride((p) => !p)}
                      className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-white transition"
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
                        className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold text-white uppercase hover:bg-green-600"
                      >
                        Add Override
                      </button>
                      <button
                        onClick={() => setShowAddOverride(false)}
                        className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-bold text-gray-500 uppercase dark:border-gray-700 dark:text-gray-400"
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
                          <span className="text-brand-500">{ov.instance ?? ov.rack_id}</span>
                          <span className="mx-1.5 text-gray-400 dark:text-gray-500">→</span>
                          <span className="text-amber-500">{ov.metric}</span>
                          <span className="mx-1.5 text-gray-400 dark:text-gray-500">=</span>
                          <span className="text-gray-800 dark:text-white/90">{ov.value}</span>
                        </span>
                        <button
                          onClick={() =>
                            api
                              .deleteSimulatorOverride(ov.id)
                              .then(loadSimulatorData)
                              .catch(() => {
                                /* noop */
                              })
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
      </div>

      {/* Slurm Plugin */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
            <Cpu className="h-4 w-4 text-blue-500" />
          </div>
          <div className="pt-0.5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Slurm Plugin</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Workload manager integration for HPC clusters. Configuration file:
              config/plugins/slurm/config.yml
            </p>
          </div>
        </div>

        <FormToggle
          label="Enable Slurm Integration"
          description="Activate Slurm plugin — enables HPC wallboard, node list, partitions and alerts views."
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
              : 'cursor-not-allowed text-gray-400 opacity-50 dark:text-gray-500'
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
          <div className="mt-4 space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            {/* ── Prometheus Source ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                Prometheus Source
              </p>
              <SettingField
                label="Metric name"
                tooltip="Prometheus metric name that exposes Slurm node statuses. Default: slurm_node_status"
              >
                <input
                  value={draft.plugins.slurm.metric}
                  onChange={(e) => updateSlurm('metric', e.target.value)}
                  placeholder="slurm_node_status"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </SettingField>
              <div className="grid grid-cols-3 gap-3">
                <SettingField
                  label="Node label"
                  tooltip="Prometheus label that identifies the node name (e.g. node, hostname)."
                >
                  <input
                    value={draft.plugins.slurm.label_node}
                    onChange={(e) => updateSlurm('label_node', e.target.value)}
                    placeholder="node"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </SettingField>
                <SettingField
                  label="Status label"
                  tooltip="Prometheus label that carries the Slurm node status value (e.g. status, state)."
                >
                  <input
                    value={draft.plugins.slurm.label_status}
                    onChange={(e) => updateSlurm('label_status', e.target.value)}
                    placeholder="status"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </SettingField>
                <SettingField
                  label="Partition label"
                  tooltip="Prometheus label for the Slurm partition name (e.g. partition, queue)."
                >
                  <input
                    value={draft.plugins.slurm.label_partition}
                    onChange={(e) => updateSlurm('label_partition', e.target.value)}
                    placeholder="partition"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </SettingField>
              </div>
            </div>

            {/* ── Node Filtering ── */}
            <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-gray-700">
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                Node Filtering
              </p>

              <SettingField
                label="Device roles"
                tooltip="Only devices whose template role matches one of these values will appear in Slurm views. Leave empty to match all."
              >
                {/* TagInput — same design as /ui/tag-input */}
                <div
                  onClick={() => roleInputRef.current?.focus()}
                  className="focus-within:border-brand-500 flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                >
                  {draft.plugins.slurm.roles.map((role, idx) => (
                    <span
                      key={idx}
                      className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {role}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSlurm(
                            'roles',
                            draft.plugins.slurm.roles.filter((_, i) => i !== idx)
                          );
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={roleInputRef}
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && roleInput.trim()) {
                        e.preventDefault();
                        const val = roleInput.trim().toLowerCase();
                        if (!draft.plugins.slurm.roles.includes(val))
                          updateSlurm('roles', [...draft.plugins.slurm.roles, val]);
                        setRoleInput('');
                      } else if (
                        e.key === 'Backspace' &&
                        !roleInput &&
                        draft.plugins.slurm.roles.length > 0
                      ) {
                        updateSlurm('roles', draft.plugins.slurm.roles.slice(0, -1));
                      }
                    }}
                    className="min-w-[100px] flex-1 border-none bg-transparent text-sm outline-none dark:text-white"
                    placeholder={
                      draft.plugins.slurm.roles.length === 0 ? 'Type a role and press Enter' : ''
                    }
                  />
                </div>
              </SettingField>

              <FormToggle
                label="Include unlabeled nodes"
                description="Show devices that have no role defined in their template."
                checked={draft.plugins.slurm.include_unlabeled}
                onChange={(value) => updateSlurm('include_unlabeled', value)}
              />

              <SettingField
                label="Node mapping file"
                tooltip="YAML file mapping Slurm node names / patterns to topology instance names. Supports wildcards: n* → compute*."
              >
                <input
                  value={draft.plugins.slurm.mapping_path}
                  onChange={(e) => updateSlurm('mapping_path', e.target.value)}
                  placeholder="config/plugins/slurm/node_mapping.yaml"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </SettingField>

              {/* Mapping editor */}
              <SlurmMappingEditor mappingPath={draft.plugins.slurm.mapping_path} />
            </div>

            {/* ── Severity Colors ── */}
            <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-gray-700">
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                Severity Colors
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['ok', 'warn', 'crit', 'info'] as const).map((sev) => (
                  <div
                    key={sev}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <input
                      type="color"
                      value={draft.plugins.slurm.severity_colors[sev]}
                      onChange={(e) => updateSlurmColor(sev, e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[10px] font-bold tracking-wider uppercase"
                        style={{ color: draft.plugins.slurm.severity_colors[sev] }}
                      >
                        {sev}
                      </div>
                      <div className="font-mono text-[9px] text-gray-400">
                        {draft.plugins.slurm.severity_colors[sev]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Status Mapping ── */}
            <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                  Status Mapping
                </p>
                <span className="text-[10px] text-gray-400 dark:text-gray-600">
                  — drag to move between zones, click + to add
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {(['ok', 'warn', 'crit', 'info'] as const).map((sev) => {
                  const color = draft.plugins.slurm.severity_colors[sev];
                  return (
                    <div
                      key={sev}
                      className="flex flex-col gap-2 rounded-lg border-2 border-dashed p-3 transition"
                      style={{ borderColor: color }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.background = `${color}12`;
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.background = '';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.background = '';
                        const status = e.dataTransfer.getData('status');
                        const from = e.dataTransfer.getData('fromSeverity') as
                          | 'ok'
                          | 'warn'
                          | 'crit'
                          | 'info'
                          | null;
                        if (status) moveSlurmStatus(status, from || null, sev);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-black tracking-wider uppercase"
                          style={{ color }}
                        >
                          {sev}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {draft.plugins.slurm.status_map[sev].length}
                        </span>
                      </div>
                      <div className="min-h-[60px] space-y-1">
                        {draft.plugins.slurm.status_map[sev].map((status) => (
                          <div
                            key={status}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('status', status);
                              e.dataTransfer.setData('fromSeverity', sev);
                              e.currentTarget.style.opacity = '0.4';
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                            className="group flex cursor-grab items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                            style={{ borderLeftWidth: 2, borderLeftColor: color }}
                          >
                            <GripVertical className="h-3 w-3 shrink-0 text-gray-300 dark:text-gray-600" />
                            <span className="flex-1 font-mono text-gray-600 dark:text-gray-300">
                              {status}
                            </span>
                            <button
                              type="button"
                              onClick={() => moveSlurmStatus(status, sev, null)}
                              className="hidden text-gray-300 group-hover:block hover:text-red-400 dark:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Add new status to this zone */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.elements[0] as HTMLInputElement;
                          const val = input.value.trim().toLowerCase();
                          if (val && !draft.plugins.slurm.status_map[sev].includes(val)) {
                            moveSlurmStatus(val, null, sev);
                            input.value = '';
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="add status…"
                            className="min-w-0 flex-1 rounded border border-dashed border-gray-200 bg-transparent px-2 py-1 font-mono text-[10px] text-gray-400 focus:outline-none dark:border-gray-700"
                          />
                          <button
                            type="submit"
                            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Drag statuses between zones to reclassify them. Click × to remove. Unclassified
                statuses are shown as UNKNOWN.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
