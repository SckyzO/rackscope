import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface SlurmSeverityColors {
  ok: string;
  warn: string;
  crit: string;
  info: string;
}

interface SlurmConfig {
  severity_colors: SlurmSeverityColors;
}

export const useSlurmConfig = () => {
  const [severityColors, setSeverityColors] = useState<SlurmSeverityColors>({
    ok: '#22c55e',
    warn: '#f59e0b',
    crit: '#ef4444',
    info: '#3b82f6',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        const slurmConfig = config.plugins?.slurm as SlurmConfig | undefined;
        if (slurmConfig?.severity_colors) {
          setSeverityColors(slurmConfig.severity_colors);
        }
      } catch (err) {
        console.error('Failed to load Slurm config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  return { severityColors, loading };
};
