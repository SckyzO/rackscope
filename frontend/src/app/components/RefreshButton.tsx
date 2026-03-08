/**
 * RefreshButton — shared split button for page-level refresh
 *
 * Usage:
 *   const { autoRefreshMs, onIntervalChange } = useAutoRefresh('room', loadData);
 *   <RefreshButton refreshing={loading} autoRefreshMs={autoRefreshMs} onRefresh={loadData} onIntervalChange={onIntervalChange} />
 *
 * The interval is persisted to localStorage under `rackscope.refresh.<pageKey>`.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { RefreshCw, ChevronDown, Check } from 'lucide-react';

// ── Shared interval options ────────────────────────────────────────────────────

export const REFRESH_OPTIONS = [
  { label: 'Off', ms: 0 },
  { label: '15s', ms: 15_000 },
  { label: '30s', ms: 30_000 },
  { label: '1m', ms: 60_000 },
  { label: '2m', ms: 120_000 },
  { label: '5m', ms: 300_000 },
  { label: '10m', ms: 600_000 },
  { label: '30m', ms: 1_800_000 },
  { label: '1h', ms: 3_600_000 },
];

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Manages auto-refresh state for a page.
 * `pageKey` must be stable (e.g. 'room', 'rack', 'slurm-nodes').
 * The last-used interval is persisted in localStorage.
 */
export const useAutoRefresh = (pageKey: string, onRefresh: () => void | Promise<void>) => {
  const storageKey = `rackscope.refresh.${pageKey}`;

  const [autoRefreshMs, setAutoRefreshMs] = useState<number>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? Number(stored) : 0;
  });

  // Stable ref so the interval callback never captures a stale closure.
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (autoRefreshMs === 0) return;
    const timer = setInterval(() => void onRefreshRef.current(), autoRefreshMs);
    return () => clearInterval(timer);
  }, [autoRefreshMs]);

  const onIntervalChange = useCallback(
    (ms: number) => {
      setAutoRefreshMs(ms);
      localStorage.setItem(storageKey, String(ms));
    },
    [storageKey]
  );

  return { autoRefreshMs, onIntervalChange };
};

// ── Component ──────────────────────────────────────────────────────────────────

export const RefreshButton = ({
  refreshing,
  loading,
  autoRefreshMs,
  onRefresh,
  onIntervalChange,
}: {
  /** Whether the refresh is currently in progress */
  refreshing?: boolean;
  /** Alias for refreshing — accepted for backward compatibility */
  loading?: boolean;
  autoRefreshMs: number;
  onRefresh: () => void | Promise<void>;
  onIntervalChange: (ms: number) => void;
}) => {
  const isRefreshing = refreshing ?? loading ?? false;
  const [dropOpen, setDropOpen] = useState(false);
  const currentLabel = REFRESH_OPTIONS.find((o) => o.ms === autoRefreshMs)?.label ?? '?';
  const isAutoActive = autoRefreshMs > 0;

  return (
    // overflow-hidden intentionally omitted — it clips the absolute dropdown.
    // Rounded corners are applied per-button instead.
    <div className="relative flex items-stretch rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Left: manual trigger */}
      <button
        onClick={() => void onRefresh()}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
        {isAutoActive && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            {currentLabel}
          </span>
        )}
      </button>

      {/* Divider */}
      <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700" />

      {/* Right: interval picker */}
      <div className="relative">
        <button
          onClick={() => setDropOpen((v) => !v)}
          className="flex h-full items-center rounded-r-lg px-2 text-gray-400 transition-colors hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-700"
          aria-label="Choose refresh interval"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {dropOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setDropOpen(false)} />
            <div className="absolute top-full right-0 z-30 mt-1 w-28 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
              {REFRESH_OPTIONS.map((opt) => (
                <button
                  key={opt.ms}
                  onClick={() => {
                    onIntervalChange(opt.ms);
                    setDropOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                    autoRefreshMs === opt.ms
                      ? 'text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {opt.label}
                  {autoRefreshMs === opt.ms && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
