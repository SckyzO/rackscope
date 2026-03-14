/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from '@src/services/api';
import type { AppConfig } from '@src/types';

// Feature flags with safe defaults (fail-open: show everything if config not loaded)
type AppFeatures = {
  notifications: boolean;
  notifications_max_visible: number;
  toast_duration_seconds: number;
  toast_position: string;
  toast_stack_threshold: number;
  worldmap: boolean;
  aisle_dashboard: boolean;
  dev_tools: boolean;
  playlist: boolean;
  wizard: boolean;
};

// Plugin enabled status
type AppPlugins = {
  slurm: boolean;
  simulator: boolean;
};

type AppConfigContextType = {
  config: AppConfig | null;
  loading: boolean;
  features: AppFeatures;
  plugins: AppPlugins;
  playlist: { interval_seconds: number; views: string[] };
  // true when demo mode is enabled but the simulator container is unreachable
  simulatorDown: boolean;
  refresh: () => Promise<void>;
};

const DEFAULT_FEATURES: AppFeatures = {
  notifications: true,
  notifications_max_visible: 10,
  toast_duration_seconds: 15,
  toast_position: 'bottom-right',
  toast_stack_threshold: 5,
  worldmap: true,
  aisle_dashboard: true,
  dev_tools: false,
  playlist: false,
  wizard: true,
};

const DEFAULT_PLUGINS: AppPlugins = {
  slurm: false,
  simulator: false,
};

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  // simulatorDown: true when demo mode is enabled but simulator is unreachable.
  // Polled every 30s so the UI reflects crashes promptly.
  const [simulatorDown, setSimulatorDown] = useState(false);

  const load = async () => {
    try {
      const data = await api.getConfig();
      setConfig(data);
    } catch {
      /* ignore — defaults apply */
    } finally {
      setLoading(false);
    }
  };

  // Poll simulator health only when demo mode is on.
  // Uses a short 2s timeout so the UI responds quickly to crashes.
  const checkSimulator = useCallback(async (demoEnabled: boolean) => {
    if (!demoEnabled) {
      setSimulatorDown(false);
      return;
    }
    try {
      const status = await api.getSimulatorStatus();
      setSimulatorDown(!status?.running);
    } catch {
      setSimulatorDown(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, []);

  // Start polling as soon as config is loaded and demo mode is known
  useEffect(() => {
    const demoEnabled = config?.plugins?.simulator?.enabled === true;
    void checkSimulator(demoEnabled);
    if (!demoEnabled) return;
    // Poll every 30s to detect simulator crashes
    const id = setInterval(() => void checkSimulator(true), 30_000);
    return () => clearInterval(id);
  }, [config, checkSimulator]);

  // Derive feature flags — default true for core features, false for opt-in
  const features: AppFeatures = {
    notifications: config?.features?.notifications !== false,
    notifications_max_visible: Number(config?.features?.notifications_max_visible ?? 10),
    toast_duration_seconds: Number(config?.features?.toast_duration_seconds ?? 15),
    toast_position: config?.features?.toast_position ?? 'bottom-right',
    toast_stack_threshold: Number(config?.features?.toast_stack_threshold ?? 5),
    worldmap: config?.features?.worldmap !== false,
    aisle_dashboard: config?.features?.aisle_dashboard !== false,
    dev_tools: config?.features?.dev_tools === true,
    playlist: config?.features?.playlist === true,
    wizard: config?.features?.wizard !== false,
  };

  // Derive plugin enabled flags from plugins dict
  const plugins: AppPlugins = {
    slurm: config?.plugins?.slurm?.enabled === true,
    simulator: config?.plugins?.simulator?.enabled === true,
  };

  const playlist = {
    interval_seconds: config?.playlist?.interval_seconds ?? 30,
    views: config?.playlist?.views ?? ['/views/worldmap', '/slurm/overview'],
  };

  return (
    <AppConfigContext.Provider
      value={{ config, loading, features, plugins, playlist, simulatorDown, refresh: load }}
    >
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = (): AppConfigContextType => {
  const context = useContext(AppConfigContext);
  if (!context) throw new Error('useAppConfig must be used within AppConfigProvider');
  return context;
};

// Safe hook that returns defaults when outside provider (for edge cases)
export const useAppConfigSafe = (): AppConfigContextType => {
  const context = useContext(AppConfigContext);
  return (
    context ?? {
      config: null,
      loading: false,
      features: DEFAULT_FEATURES,
      plugins: DEFAULT_PLUGINS,
      playlist: { interval_seconds: 30, views: [] },
      simulatorDown: false,
      refresh: async () => {
        /* noop */
      },
    }
  );
};
