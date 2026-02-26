import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, XCircle, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAppConfigSafe } from '../contexts/AppConfigContext';
import type { ActiveAlert } from '../../types';

interface ToastEntry {
  id: string;
  alertId: string;
  title: string;
  message: string;
  severity: string;
}

const toastConfig = {
  WARN: {
    Icon: AlertTriangle,
    bg: 'bg-warning-50 dark:bg-warning-500/10',
    border: 'border-warning-200 dark:border-warning-500/30',
    icon_c: 'text-warning-500',
    title_c: 'text-warning-700 dark:text-warning-400',
  },
  CRIT: {
    Icon: XCircle,
    bg: 'bg-error-50 dark:bg-error-500/10',
    border: 'border-error-200 dark:border-error-500/30',
    icon_c: 'text-error-500',
    title_c: 'text-error-700 dark:text-error-400',
  },
};

const buildAlertId = (alert: ActiveAlert): string =>
  `${alert.node_id}:${alert.checks.map((c) => c.id).sort().join(',')}`;

const getAlertSeverity = (alert: ActiveAlert): 'WARN' | 'CRIT' | null => {
  const hasCrit = alert.checks.some((c) => c.severity === 'CRIT');
  if (hasCrit) return 'CRIT';
  const hasWarn = alert.checks.some((c) => c.severity === 'WARN');
  if (hasWarn) return 'WARN';
  return null;
};

let toastCounter = 0;

export const AlertToastContainer = () => {
  const { features } = useAppConfigSafe();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const seenAlertIds = useRef<Set<string>>(new Set());
  const isFirstPoll = useRef(true);
  const durationMs = features.toast_duration_seconds * 1000;

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const poll = useCallback(async () => {
    try {
      const { alerts } = await api.getActiveAlerts();

      if (isFirstPoll.current) {
        // Mark all current alerts as seen on initial load — no toasts on mount
        alerts.forEach((alert) => {
          seenAlertIds.current.add(buildAlertId(alert));
        });
        isFirstPoll.current = false;
        return;
      }

      const newToasts: ToastEntry[] = [];

      alerts.forEach((alert) => {
        const alertId = buildAlertId(alert);
        if (seenAlertIds.current.has(alertId)) return;
        seenAlertIds.current.add(alertId);

        const severity = getAlertSeverity(alert);
        if (!severity) return;

        const critChecks = alert.checks.filter((c) => c.severity === 'CRIT');
        const warnChecks = alert.checks.filter((c) => c.severity === 'WARN');
        const relevantChecks = severity === 'CRIT' ? critChecks : warnChecks;
        const checkName = relevantChecks[0]?.id ?? 'unknown check';

        newToasts.push({
          id: `toast-${++toastCounter}`,
          alertId,
          title: alert.device_name || alert.node_id,
          message: checkName,
          severity,
        });
      });

      if (newToasts.length === 0) return;

      setToasts((prev) => [...prev, ...newToasts]);

      newToasts.forEach((toast) => {
        setTimeout(() => dismiss(toast.id), durationMs);
      });
    } catch {
      // Silently ignore polling errors — non-critical background task
    }
  }, [dismiss, durationMs]);

  useEffect(() => {
    if (!features.notifications) return;

    void poll();
    const interval = setInterval(() => void poll(), 30_000);
    return () => clearInterval(interval);
  }, [features.notifications, poll]);

  if (!features.notifications || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => {
        const cfg = toastConfig[toast.severity as 'WARN' | 'CRIT'] ?? toastConfig.WARN;
        const { Icon } = cfg;
        return (
          <div
            key={toast.id}
            className={`shadow-theme-lg flex w-80 items-start gap-3 rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${cfg.icon_c}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${cfg.title_c}`}>{toast.title}</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{toast.message}</p>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
