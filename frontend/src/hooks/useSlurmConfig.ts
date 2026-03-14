import { useState, useEffect } from 'react';
import { api } from '@src/services/api';

type SlurmSeverityColors = {
  ok: string;
  warn: string;
  crit: string;
  info: string;
}

const DEFAULT_STATUS_MAP: Record<string, string> = {
  allocated: 'ok',
  alloc: 'ok',
  completing: 'ok',
  comp: 'ok',
  mixed: 'ok',
  idle: 'info',
  drain: 'warn',
  draining: 'warn',
  drained: 'warn',
  maint: 'warn',
  reserved: 'warn',
  down: 'crit',
  fail: 'crit',
  error: 'crit',
  unknown: 'crit',
};

const DEFAULT_COLORS: SlurmSeverityColors = {
  ok: '#22c55e',
  warn: '#f59e0b',
  crit: '#ef4444',
  info: '#3b82f6',
};

const FALLBACK_COLOR = '#6b7280';

export const useSlurmConfig = () => {
  const [severityColors, setSeverityColors] = useState<SlurmSeverityColors>(DEFAULT_COLORS);
  const [statusMap, setStatusMap] = useState<Record<string, string>>(DEFAULT_STATUS_MAP);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        const slurm = config.plugins?.slurm as
          | {
              severity_colors?: Partial<SlurmSeverityColors>;
              status_map?: Record<string, string[]>;
            }
          | undefined;
        if (slurm?.severity_colors) {
          setSeverityColors({ ...DEFAULT_COLORS, ...slurm.severity_colors });
        }
        if (slurm?.status_map) {
          const inverted: Record<string, string> = { ...DEFAULT_STATUS_MAP };
          for (const [sev, statuses] of Object.entries(slurm.status_map)) {
            if (Array.isArray(statuses)) {
              for (const s of statuses) inverted[s.toLowerCase()] = sev;
            }
          }
          setStatusMap(inverted);
        }
      } catch (err) {
        console.error('Failed to load Slurm config:', err);
      } finally {
        setLoading(false);
      }
    };
    void loadConfig();
  }, []);

  const getStatusColor = (status: string): string => {
    const sev = statusMap[status.toLowerCase()];
    if (!sev) return FALLBACK_COLOR;
    return severityColors[sev as keyof SlurmSeverityColors] ?? FALLBACK_COLOR;
  };

  return { severityColors, getStatusColor, loading };
};
