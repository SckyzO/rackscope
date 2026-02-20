import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { FormField } from '../common/FormField';
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
  const [simulatorSettingsOpen, setSimulatorSettingsOpen] = useState(false);
  const [slurmSettingsOpen, setSlurmSettingsOpen] = useState(false);

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
          ⚠️ Backend Restart Required
        </h4>
        <p className="text-xs text-[var(--color-text-base)]">
          Enabling or disabling plugins requires a backend restart to take effect. Run{' '}
          <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs">make restart</code> or{' '}
          <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs">
            docker compose restart backend
          </code>{' '}
          after saving.
        </p>
      </div>

      {/* Simulator Plugin */}
      <div
        className="rounded-xl border border-[var(--color-border)] p-6"
        style={{ backgroundColor: 'var(--color-bg-panel)' }}
      >
        <div className="mb-4">
          <h3
            className="text-sm font-bold tracking-wider uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Simulator Plugin
          </h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Metrics simulator for testing without real hardware
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-xs" style={{ color: 'var(--color-text-base)' }}>
            <strong>Note:</strong> The simulator only works when using{' '}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs">
              docker-compose-dev.yaml
            </code>
            . Make sure to start the stack with{' '}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs">make up</code> or{' '}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs">
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
          className="mt-4 flex items-center gap-2 text-sm font-medium transition"
          style={{
            color: draft.plugins.simulator.enabled
              ? 'var(--color-text-secondary)'
              : 'var(--color-text-muted)',
            opacity: draft.plugins.simulator.enabled ? 1 : 0.5,
            cursor: draft.plugins.simulator.enabled ? 'pointer' : 'not-allowed',
          }}
        >
          {simulatorSettingsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced Settings
        </button>

        {simulatorSettingsOpen && draft.plugins.simulator.enabled && (
          <div
            className="mt-4 space-y-4 rounded-lg border border-[var(--color-border)] p-4"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
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
            <FormField
              label="Scenario"
              value={draft.plugins.simulator.scenario}
              onChange={(value) => updateSimulator('scenario', value)}
              placeholder="full-ok, demo-small, random-demo-small"
            />
            <FormField
              label="Scale Factor"
              value={draft.plugins.simulator.scale_factor}
              onChange={(value) => updateSimulator('scale_factor', value)}
              type="number"
            />

            {/* Incident Rates */}
            <div className="space-y-2">
              <label
                className="block text-xs font-bold tracking-wider uppercase"
                style={{ color: 'var(--color-text-secondary)' }}
              >
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
              <label
                className="block text-xs font-bold tracking-wider uppercase"
                style={{ color: 'var(--color-text-secondary)' }}
              >
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
            <FormField
              label="Metrics Catalog Path"
              value={draft.plugins.simulator.metrics_catalog_path}
              onChange={(value) => updateSimulator('metrics_catalog_path', value)}
              placeholder="config/plugins/simulator/metrics_full.yaml"
            />

            {/* Metrics Catalogs */}
            <div className="space-y-2">
              <label
                className="block text-xs font-bold tracking-wider uppercase"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Metrics Catalogs (Multi-file support)
              </label>
              <div className="space-y-2">
                {draft.plugins.simulator.metrics_catalogs.map((catalog, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded border border-[var(--color-border)] p-3"
                    style={{ backgroundColor: 'var(--color-bg-panel)' }}
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

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 font-mono text-xs font-bold tracking-wider text-blue-400 uppercase">
                Simulator Control Panel
              </h4>
              <p className="mb-3 text-xs text-[var(--color-text-base)]">
                Manage test scenarios and metric overrides from the dedicated control panel.
              </p>
              <Link
                to="/simulator"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold uppercase transition"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Open Control Panel
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Slurm Plugin */}
      <div
        className="rounded-xl border border-[var(--color-border)] p-6"
        style={{ backgroundColor: 'var(--color-bg-panel)' }}
      >
        <div className="mb-4">
          <h3
            className="text-sm font-bold tracking-wider uppercase"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Slurm Plugin
          </h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Workload manager integration for HPC clusters
          </p>
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
          className="mt-4 flex items-center gap-2 text-sm font-medium transition"
          style={{
            color: draft.plugins.slurm.enabled
              ? 'var(--color-text-secondary)'
              : 'var(--color-text-muted)',
            opacity: draft.plugins.slurm.enabled ? 1 : 0.5,
            cursor: draft.plugins.slurm.enabled ? 'pointer' : 'not-allowed',
          }}
        >
          {slurmSettingsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced Settings
        </button>

        {slurmSettingsOpen && draft.plugins.slurm.enabled && (
          <div
            className="mt-4 space-y-4 rounded-lg border border-[var(--color-border)] p-4"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
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
              <label
                className="block text-xs font-bold tracking-wider uppercase"
                style={{ color: 'var(--color-text-secondary)' }}
              >
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
              <label
                className="block text-xs font-bold tracking-wider uppercase"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Severity Colors
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <label
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)', minWidth: '60px' }}
                  >
                    OK
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.ok}
                    onChange={(e) => updateSlurmColor('ok', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-[var(--color-border)]"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.ok}
                    onChange={(e) => updateSlurmColor('ok', e.target.value)}
                    className="w-24 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-base)',
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)', minWidth: '60px' }}
                  >
                    WARN
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.warn}
                    onChange={(e) => updateSlurmColor('warn', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-[var(--color-border)]"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.warn}
                    onChange={(e) => updateSlurmColor('warn', e.target.value)}
                    className="w-24 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-base)',
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)', minWidth: '60px' }}
                  >
                    CRIT
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.crit}
                    onChange={(e) => updateSlurmColor('crit', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-[var(--color-border)]"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.crit}
                    onChange={(e) => updateSlurmColor('crit', e.target.value)}
                    className="w-24 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-base)',
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)', minWidth: '60px' }}
                  >
                    INFO
                  </label>
                  <input
                    type="color"
                    value={draft.plugins.slurm.severity_colors.info}
                    onChange={(e) => updateSlurmColor('info', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-[var(--color-border)]"
                  />
                  <input
                    type="text"
                    value={draft.plugins.slurm.severity_colors.info}
                    onChange={(e) => updateSlurmColor('info', e.target.value)}
                    className="w-24 rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-base)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Status Mapping */}
            <div className="space-y-3">
              <label
                className="block text-xs font-bold tracking-wider uppercase"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Status Mapping (Drag & Drop to Reorganize)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {(['ok', 'warn', 'crit', 'info'] as const).map((severity) => (
                  <div
                    key={severity}
                    className="rounded-lg border-2 border-dashed p-4 transition"
                    style={{
                      borderColor: draft.plugins.slurm.severity_colors[severity],
                      backgroundColor: 'var(--color-bg-elevated)',
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
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
                          className="flex cursor-move items-center gap-2 rounded border border-[var(--color-border)] px-3 py-2 transition hover:border-[var(--color-accent)]"
                          style={{
                            backgroundColor: 'var(--color-bg-panel)',
                            borderLeftWidth: '3px',
                            borderLeftColor: draft.plugins.slurm.severity_colors[severity],
                          }}
                        >
                          <svg
                            className="h-4 w-4 flex-shrink-0"
                            style={{ color: 'var(--color-text-muted)' }}
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
                          <span
                            className="flex-1 font-mono text-xs"
                            style={{ color: 'var(--color-text-base)' }}
                          >
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Drag and drop statuses between severity zones to reorganize them.
              </p>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 font-mono text-xs font-bold tracking-wider text-blue-400 uppercase">
                Slurm Features
              </h4>
              <ul className="space-y-2 text-xs text-[var(--color-text-base)]">
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
