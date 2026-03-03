import { useState, useEffect } from 'react';

export const SEVERITY_KEYS = ['OK', 'WARN', 'CRIT', 'UNKNOWN', 'INFO'] as const;
export type SeverityKey = (typeof SEVERITY_KEYS)[number];

export const DEFAULT_SEVERITY_LABELS: Record<SeverityKey, string> = {
  OK: 'OK',
  WARN: 'Warning',
  CRIT: 'Critical',
  UNKNOWN: 'Unknown',
  INFO: 'Info',
};

const STORAGE_KEY = 'rackscope.severity-labels';
const EVENT = 'rackscope:severity-labels-changed';

export function loadSeverityLabels(): Record<SeverityKey, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SEVERITY_LABELS };
    return { ...DEFAULT_SEVERITY_LABELS, ...(JSON.parse(raw) as Partial<Record<SeverityKey, string>>) };
  } catch {
    return { ...DEFAULT_SEVERITY_LABELS };
  }
}

export function saveSeverityLabels(labels: Record<SeverityKey, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // quota exceeded — ignore
  }
}

/** Synchronous label lookup — use in non-React contexts */
export function getSeverityLabel(key: string): string {
  const labels = loadSeverityLabels();
  return labels[key as SeverityKey] ?? key;
}

/** React hook — re-renders when labels change in settings */
export function useSeverityLabels(): Record<SeverityKey, string> {
  const [labels, setLabels] = useState<Record<SeverityKey, string>>(() => loadSeverityLabels());

  useEffect(() => {
    const handler = () => setLabels(loadSeverityLabels());
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return labels;
}
