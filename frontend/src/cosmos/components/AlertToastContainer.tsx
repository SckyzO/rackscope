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
  const stackThreshold = features.toast_stack_threshold;
  const positionClass =
    features.toast_position === 'top-right' ? 'top-4 right-4' : 'bottom-4 right-4';

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const poll = useCallback(async () => {
    try {
      const { alerts } = await api.getActiveAlerts();

      if (isFirstPoll.current) {
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

  const [expanded, setExpanded] = useState(false);

  if (!features.notifications || toasts.length === 0) return null;

  // ── Stacked mode ──────────────────────────────────────────────────────────
  const isStacked = stackThreshold > 0 && toasts.length > stackThreshold;

  // When expanded, show all toasts individually even if stacked threshold exceeded
  if (isStacked && expanded) {
    return (
      <div className={`fixed z-[9999] ${positionClass} flex flex-col gap-2`}>
        {/* Collapse button */}
        <button
          onClick={() => setExpanded(false)}
          className={`flex w-80 items-center justify-between rounded-lg border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-500 backdrop-blur-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-400 dark:hover:bg-gray-800`}
        >
          <span>{toasts.length} alerts</span>
          <span className="text-[10px] opacity-60">▲ Collapse</span>
        </button>
        {toasts.map((toast) => {
          const cfg = toastConfig[toast.severity as 'WARN' | 'CRIT'] ?? toastConfig.WARN;
          const { Icon } = cfg;
          return (
            <div key={toast.id} className={`shadow-theme-lg flex w-80 items-start gap-3 rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
              <Icon className={`h-5 w-5 shrink-0 ${cfg.icon_c}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${cfg.title_c}`}>{toast.title}</p>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{toast.message}</p>
              </div>
              <button onClick={() => dismiss(toast.id)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  if (isStacked) {
    // Most recently added toast = last element
    const mainToast = toasts[toasts.length - 1];
    const cfg = toastConfig[mainToast.severity as 'WARN' | 'CRIT'] ?? toastConfig.WARN;
    const { Icon } = cfg;
    // Show at most 2 ghost cards behind the main one
    const ghostLayers = Math.min(toasts.length - 1, 2);
    // For top-right: ghosts peek downward; for bottom-right: ghosts peek upward
    const isTop = features.toast_position === 'top-right';

    return (
      <div className={`fixed z-[9999] ${positionClass} flex flex-col items-end gap-2`}>
        {/* Stack group — relative container to anchor ghost cards */}
        <div className="relative w-80">
          {/* Ghost card 2 (furthest back) */}
          {ghostLayers >= 2 && (
            <div
              className={`absolute inset-0 rounded-xl border ${cfg.bg} ${cfg.border} opacity-30`}
              style={{
                transform: isTop
                  ? 'translateY(10px) scaleX(0.88)'
                  : 'translateY(-10px) scaleX(0.88)',
                transformOrigin: 'center',
                zIndex: 1,
              }}
            />
          )}
          {/* Ghost card 1 (slightly behind) */}
          {ghostLayers >= 1 && (
            <div
              className={`absolute inset-0 rounded-xl border ${cfg.bg} ${cfg.border} opacity-55`}
              style={{
                transform: isTop
                  ? 'translateY(5px) scaleX(0.94)'
                  : 'translateY(-5px) scaleX(0.94)',
                transformOrigin: 'center',
                zIndex: 2,
              }}
            />
          )}
          {/* Main toast — front */}
          <div
            className={`shadow-theme-lg relative flex items-start gap-3 rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
            style={{ zIndex: 10 }}
          >
            <Icon className={`h-5 w-5 shrink-0 ${cfg.icon_c}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${cfg.title_c}`}>{mainToast.title}</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                {mainToast.message}
              </p>
            </div>
            <button
              onClick={() => dismiss(mainToast.id)}
              className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Footer: count + expand + dismiss all */}
        <div className="flex w-80 items-center justify-between px-1 text-xs">
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          >
            <span>{toasts.length} alert{toasts.length !== 1 ? 's' : ''}</span>
            <span className="opacity-50">▼ Expand</span>
          </button>
          <button
            onClick={dismissAll}
            className="rounded px-2 py-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            Dismiss all
          </button>
        </div>
      </div>
    );
  }

  // ── Normal mode — show all toasts individually ─────────────────────────────
  return (
    <div className={`fixed z-[9999] ${positionClass} flex flex-col gap-2`}>
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
