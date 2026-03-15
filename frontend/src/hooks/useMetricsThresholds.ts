/**
 * useMetricsThresholds — fetches display thresholds from /api/metrics/library once
 * and caches them at module level to avoid repeated requests.
 *
 * Usage:
 *   const thresholds = useMetricsThresholds();
 *   const { warn, crit } = thresholds['node_temperature'] ?? {};
 *
 * Thresholds are configured per metric in config/metrics/library/*.yaml:
 *   display:
 *     thresholds:
 *       warn: 38
 *       crit: 45
 */

import { useState, useEffect } from 'react';

export type MetricThresholds = {
  warn?: number;
  crit?: number;
};

// Module-level cache — shared across all component instances
let _cache: Record<string, MetricThresholds> | null = null;
let _promise: Promise<Record<string, MetricThresholds>> | null = null;

async function fetchThresholds(): Promise<Record<string, MetricThresholds>> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = fetch('/api/metrics/library')
    .then((r) => r.json())
    .then((data) => {
      const map: Record<string, MetricThresholds> = {};
      for (const m of data.metrics ?? []) {
        if (m.display?.thresholds) {
          map[m.id] = m.display.thresholds;
        }
      }
      _cache = map;
      return map;
    })
    .catch(() => {
      _promise = null;
      return {};
    });

  return _promise;
}

export function useMetricsThresholds(): Record<string, MetricThresholds> {
  const [thresholds, setThresholds] = useState<Record<string, MetricThresholds>>(_cache ?? {});

  useEffect(() => {
    if (_cache) return;
    void fetchThresholds().then(setThresholds);
  }, []);

  return thresholds;
}
