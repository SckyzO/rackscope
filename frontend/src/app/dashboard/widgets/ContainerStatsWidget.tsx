import { useEffect, useRef, useState } from 'react';
import { Container } from 'lucide-react';
import { registerWidget, type WidgetRegistration } from '../registry';
import { api } from '@src/services/api';

// ── Widget config ──────────────────────────────────────────────────────────
const WIDGET_META: Omit<WidgetRegistration, 'component'> = {
  type: 'container-stats',
  title: 'Container Stats',
  description: 'Memory and CPU usage for backend, simulator and Prometheus',
  group: 'Overview',
  icon: Container,
  defaultW: 4,
  defaultH: 2,
  minW: 2,
  minH: 1,
  showTitle: true,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtMemory(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function memColor(bytes: number | null): string {
  if (bytes === null) return 'text-gray-400 dark:text-gray-500';
  const mb = bytes / 1_048_576;
  if (mb < 200) return 'text-emerald-600 dark:text-emerald-400';
  if (mb < 600) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

// ── Service row ────────────────────────────────────────────────────────────
type ServiceStats = {
  memory_bytes: number | null;
  cpu_seconds: number | null;
  available: boolean;
};

type ServiceRowProps = {
  label: string;
  stats: ServiceStats | null;
  prevCpu: number | null;
  elapsedSec: number;
};

const ServiceRow = ({ label, stats, prevCpu, elapsedSec }: ServiceRowProps) => {
  let cpuStr = '—';
  if (stats?.available && stats.cpu_seconds !== null && prevCpu !== null && elapsedSec > 0) {
    const pct = ((stats.cpu_seconds - prevCpu) / elapsedSec) * 100;
    cpuStr = `${Math.max(0, pct).toFixed(1)}%`;
  }

  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="min-w-0 shrink truncate text-[11px] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <div className="flex shrink-0 items-center gap-3">
        {stats?.available === false ? (
          <span className="text-[11px] text-gray-400 dark:text-gray-600">unavailable</span>
        ) : (
          <>
            <span
              className={`font-mono text-xs font-medium tabular-nums ${memColor(stats?.memory_bytes ?? null)}`}
            >
              {fmtMemory(stats?.memory_bytes ?? null)}
            </span>
            <span className="w-10 text-right font-mono text-[11px] text-gray-500 tabular-nums dark:text-gray-400">
              {cpuStr}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// ── Types ──────────────────────────────────────────────────────────────────
type ProcessStats = {
  backend: ServiceStats;
  simulator: ServiceStats;
  prometheus: ServiceStats;
};

// ── Component ──────────────────────────────────────────────────────────────
export const ContainerStatsWidget = () => {
  const [stats, setStats] = useState<ProcessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef<{ stats: ProcessStats; ts: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      api
        .getProcessStats()
        .then((data) => {
          if (!cancelled) setStats(data);
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setStats(null);
            setLoading(false);
          }
        });
    };

    poll();
    const id = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Track previous snapshot for CPU rate
  const prev = prevRef.current;
  const elapsedSec = prev ? Date.now() / 1000 - prev.ts : 0;
  useEffect(() => {
    if (stats) {
      prevRef.current = { stats, ts: Date.now() / 1000 };
    }
  }, [stats]);

  return (
    <div className="flex h-full flex-col p-4">
      {/* Column headers */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider text-gray-300 uppercase dark:text-gray-600">
          Service
        </span>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[10px] font-semibold tracking-wider text-gray-300 uppercase dark:text-gray-600">
            Memory
          </span>
          <span className="w-10 text-right text-[10px] font-semibold tracking-wider text-gray-300 uppercase dark:text-gray-600">
            CPU
          </span>
        </div>
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-gray-400">Loading…</p>
      ) : stats === null ? (
        <p className="mt-2 text-xs text-gray-400">Stats unavailable</p>
      ) : (
        <div className="flex flex-col gap-1">
          <ServiceRow
            label="Backend"
            stats={stats.backend}
            prevCpu={prev?.stats.backend.cpu_seconds ?? null}
            elapsedSec={elapsedSec}
          />
          <ServiceRow
            label="Simulator"
            stats={stats.simulator}
            prevCpu={prev?.stats.simulator.cpu_seconds ?? null}
            elapsedSec={elapsedSec}
          />
          <ServiceRow
            label="Prometheus"
            stats={stats.prometheus}
            prevCpu={prev?.stats.prometheus.cpu_seconds ?? null}
            elapsedSec={elapsedSec}
          />
        </div>
      )}

      <p className="mt-auto pt-2 text-[10px] text-gray-300 dark:text-gray-700">
        Refreshes every 15 s · CPU on second poll
      </p>
    </div>
  );
};

registerWidget({ ...WIDGET_META, component: ContainerStatsWidget });
