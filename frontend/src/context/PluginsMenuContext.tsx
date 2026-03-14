/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api';
import type { MenuSection } from '../types';

type PluginsMenuContextType = {
  sections: MenuSection[];
  loading: boolean;
  isPluginActive: (pluginId: string) => boolean;
  refresh: () => Promise<void>;
};

const PluginsMenuContext = createContext<PluginsMenuContextType | undefined>(undefined);

export const PluginsMenuProvider = ({ children }: { children: ReactNode }) => {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMenu = async () => {
    try {
      const data = await api.getPluginsMenu();
      setSections(data?.sections || []);
    } catch (err) {
      console.error('Failed to load plugins menu:', err);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMenu();
    // Poll every 30s so the sidebar reflects plugin changes (e.g. Slurm plugin enable/disable)
    // without requiring a page reload
    const interval = setInterval(loadMenu, 30000);
    return () => clearInterval(interval);
  }, []);

  const isPluginActive = (pluginId: string): boolean =>
    sections.some((section) => section.id === pluginId);

  const refresh = async () => {
    setLoading(true);
    await loadMenu();
  };

  return (
    <PluginsMenuContext.Provider value={{ sections, loading, isPluginActive, refresh }}>
      {children}
    </PluginsMenuContext.Provider>
  );
};

export const usePluginsMenu = () => {
  const context = useContext(PluginsMenuContext);
  if (!context) throw new Error('usePluginsMenu must be used within a PluginsMenuProvider');
  return context;
};
