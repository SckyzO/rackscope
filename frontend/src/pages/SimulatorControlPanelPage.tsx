import React, { useState, useEffect, useCallback } from 'react';
import { Play, Trash2, Plus, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { SimulatorScenario, SimulatorOverride } from '../types';

export const SimulatorControlPanelPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<SimulatorScenario[]>([]);
  const [overrides, setOverrides] = useState<SimulatorOverride[]>([]);
  const [activeScenario, setActiveScenario] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newOverride, setNewOverride] = useState({
    instance: '',
    metric: 'up',
    value: '0',
  });

  const loadData = useCallback(async () => {
    try {
      const [scenariosData, overridesData, config] = await Promise.all([
        api.getSimulatorScenarios(),
        api.getSimulatorOverrides(),
        api.getConfig(),
      ]);
      setScenarios(scenariosData.scenarios || []);
      setOverrides(overridesData.overrides || []);
      const currentScenario = config.plugins?.simulator?.scenario || '';
      setActiveScenario(currentScenario);
      setSelectedScenario(currentScenario);
    } catch (err) {
      console.error('Failed to load simulator data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApplyScenario = async () => {
    if (selectedScenario === activeScenario) return;

    setApplying(true);
    try {
      const config = await api.getConfig();
      const updatedConfig = {
        ...config,
        plugins: {
          ...config.plugins,
          simulator: {
            ...config.plugins.simulator,
            scenario: selectedScenario,
          },
        },
      };
      await api.updateConfig(updatedConfig);
      setActiveScenario(selectedScenario);

      // Trigger backend restart to apply scenario change
      try {
        await api.restartBackend();
      } catch (err) {
        console.warn('Failed to restart backend:', err);
      }

      // Wait a bit then reload to show new state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Failed to apply scenario:', err);
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
      await loadData();
      setShowAddOverride(false);
      setNewOverride({ instance: '', metric: 'up', value: '0' });
    } catch (err) {
      console.error('Failed to add override:', err);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      await api.deleteSimulatorOverride(overrideId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete override:', err);
    }
  };

  const handleClearOverrides = async () => {
    try {
      await api.clearSimulatorOverrides();
      await loadData();
    } catch (err) {
      console.error('Failed to clear overrides:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse font-mono text-blue-500">
          Loading simulator control panel...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-base)] p-8">
      {/* Header */}
      <header className="mb-6">
        <h1
          className="text-3xl font-black tracking-tighter uppercase"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Simulator Control Panel
        </h1>
        <p
          className="mt-1 font-mono text-xs tracking-wider uppercase"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Manage test scenarios and metric overrides
        </p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Scenarios Section */}
        <div
          className="rounded-xl border border-[var(--color-border)] p-6"
          style={{ backgroundColor: 'var(--color-bg-panel)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2
                className="text-sm font-bold tracking-wider uppercase"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Test Scenarios
              </h2>
              {activeScenario && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Currently applied:{' '}
                  <span className="font-bold" style={{ color: 'var(--color-accent)' }}>
                    {activeScenario}
                  </span>
                </p>
              )}
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs font-medium transition hover:border-[var(--color-accent)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {scenarios.length > 0 ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                {scenarios.map((scenario) => {
                  const isActive = activeScenario === scenario.name;
                  const isSelected = selectedScenario === scenario.name;

                  return (
                    <button
                      key={scenario.name}
                      onClick={() => setSelectedScenario(scenario.name)}
                      className={`relative rounded-lg border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-[var(--color-accent)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                      }`}
                      style={{
                        backgroundColor: 'var(--color-bg-elevated)',
                      }}
                    >
                      {isSelected && (
                        <div
                          className="pointer-events-none absolute inset-0 rounded-lg"
                          style={{
                            backgroundColor: 'var(--color-accent)',
                            opacity: 0.1,
                          }}
                        />
                      )}
                      {isActive && (
                        <div
                          className="absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                          style={{
                            backgroundColor: 'var(--color-accent)',
                            color: 'var(--color-text-inverse)',
                          }}
                        >
                          CURRENT
                        </div>
                      )}
                      <div className="relative flex items-center gap-2">
                        <Play
                          className="h-4 w-4"
                          style={{
                            color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                          }}
                        />
                        <div>
                          <div
                            className="text-sm font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {scenario.name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {scenario.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Apply Changes Button */}
              <button
                onClick={handleApplyScenario}
                disabled={selectedScenario === activeScenario || applying}
                className={`w-full rounded-lg px-4 py-3 text-sm font-bold tracking-wider uppercase transition ${
                  selectedScenario === activeScenario || applying
                    ? 'cursor-not-allowed opacity-50'
                    : ''
                }`}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                {applying ? 'Applying & Restarting...' : 'Apply Changes (Restart Required)'}
              </button>
            </>
          ) : (
            <div className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No scenarios available
            </div>
          )}

          <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
            <p className="text-xs" style={{ color: 'var(--color-text-base)' }}>
              <strong>Note:</strong> Changing scenarios requires a backend restart. Select a
              scenario and click "Apply Changes" to restart the backend and activate the new
              configuration.
            </p>
          </div>
        </div>

        {/* Overrides Section */}
        <div
          className="rounded-xl border border-[var(--color-border)] p-6"
          style={{ backgroundColor: 'var(--color-bg-panel)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-sm font-bold tracking-wider uppercase"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Metric Overrides
            </h2>
            <div className="flex gap-2">
              {overrides.length > 0 && (
                <button
                  onClick={handleClearOverrides}
                  className="flex items-center gap-2 rounded-lg border border-red-500/50 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              )}
              <button
                onClick={() => setShowAddOverride(!showAddOverride)}
                className="flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-medium transition"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-inverse)',
                }}
              >
                <Plus className="h-3 w-3" />
                Add Override
              </button>
            </div>
          </div>

          {showAddOverride && (
            <div
              className="mb-4 space-y-3 rounded-lg border border-[var(--color-border)] p-4"
              style={{ backgroundColor: 'var(--color-bg-elevated)' }}
            >
              <div className="space-y-2">
                <label
                  className="block text-xs font-bold tracking-wider uppercase"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Instance (node name)
                </label>
                <input
                  type="text"
                  value={newOverride.instance}
                  onChange={(e) =>
                    setNewOverride((prev) => ({ ...prev, instance: e.target.value }))
                  }
                  placeholder="compute001"
                  className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-base)',
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    className="block text-xs font-bold tracking-wider uppercase"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Metric
                  </label>
                  <input
                    type="text"
                    value={newOverride.metric}
                    onChange={(e) =>
                      setNewOverride((prev) => ({ ...prev, metric: e.target.value }))
                    }
                    placeholder="up"
                    className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-base)',
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="block text-xs font-bold tracking-wider uppercase"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Value
                  </label>
                  <input
                    type="number"
                    value={newOverride.value}
                    onChange={(e) => setNewOverride((prev) => ({ ...prev, value: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-base)',
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddOverride}
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-bold uppercase transition"
                  style={{ backgroundColor: '#22c55e', color: 'var(--color-text-inverse)' }}
                >
                  Add Override
                </button>
                <button
                  onClick={() => setShowAddOverride(false)}
                  className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-bold uppercase transition hover:bg-[var(--color-bg-elevated)]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {overrides.length > 0 ? (
            <div className="space-y-2">
              {overrides.map((override) => (
                <div
                  key={override.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3"
                  style={{ backgroundColor: 'var(--color-bg-elevated)' }}
                >
                  <div className="font-mono text-sm">
                    <span style={{ color: 'var(--color-accent)' }}>
                      {override.instance || override.rack_id}
                    </span>
                    <span className="mx-2" style={{ color: 'var(--color-text-muted)' }}>
                      →
                    </span>
                    <span style={{ color: '#f59e0b' }}>{override.metric}</span>
                    <span className="mx-2" style={{ color: 'var(--color-text-muted)' }}>
                      =
                    </span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{override.value}</span>
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
          ) : (
            !showAddOverride && (
              <div className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No active overrides. Click "Add Override" to create one.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
