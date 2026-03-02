import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, XCircle, X, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAppConfigSafe } from '../contexts/AppConfigContext';
import type { ActiveAlert } from '../../types';

interface ToastEntry {
  id: string;
  alertId: string;
  title: string;
  message: string;
  severity: string;
  rackId: string;
  rackName: string;
}

const toastConfig = {
  WARN: {
    Icon: AlertTriangle,
    bg: 'bg-warning-50 dark:bg-warning-500/22 hover:dark:bg-warning-500/90',
    border: 'border-warning-200 dark:border-warning-500/40',
    icon_c: 'text-warning-500',
    title_c: 'text-warning-700 dark:text-warning-300',
  },
  CRIT: {
    Icon: XCircle,
    bg: 'bg-error-50 dark:bg-error-500/22 hover:dark:bg-error-500/90',
    border: 'border-error-200 dark:border-error-500/40',
    icon_c: 'text-error-500',
    title_c: 'text-error-700 dark:text-error-300',
  },
};

const buildAlertId = (alert: ActiveAlert): string =>
  `${alert.node_id}:${alert.checks
    .map((c) => c.id)
    .sort()
    .join(',')}`;

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
  const navigate = useNavigate();
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
        const firstCheck = relevantChecks[0];
        // Use human-readable name if available, else format the ID
        const checkName = firstCheck?.name || firstCheck?.id?.replace(/_/g, ' ') || 'unknown check';
        const extraCount = relevantChecks.length - 1;

        newToasts.push({
          id: `toast-${++toastCounter}`,
          alertId,
          title: alert.device_name || alert.node_id,
          message: extraCount > 0 ? `${checkName} +${extraCount} more` : checkName,
          severity,
          rackId: alert.rack_id,
          rackName: alert.rack_name || alert.rack_id,
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

  const goToRack = useCallback(
    (toast: ToastEntry) => {
      dismiss(toast.id);
      navigate(`/views/rack/${toast.rackId}`);
    },
    [dismiss, navigate]
  );

  const [expanded, setExpanded] = useState(false);

  if (!features.notifications || toasts.length === 0) return null;

  // ── Stacked mode ──────────────────────────────────────────────────────────
  const isStacked = stackThreshold > 0 && toasts.length > stackThreshold;

  if (isStacked && expanded) {
    return (
      <div
        className={`fixed z-[9999] ${positionClass} flex w-80 flex-col`}
        style={{ maxHeight: 'calc(100vh - 32px)' }}
      >
        <button
          onClick={() => setExpanded(false)}
          className="flex shrink-0 items-center justify-between rounded-lg border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-600 backdrop-blur-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/95 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <span>
            {toasts.length} alert{toasts.length !== 1 ? 's' : ''}
          </span>
          <ChevronUp className="ml-2 h-3.5 w-3.5" />
        </button>
        <div className="rs-scrollbar mt-2 flex flex-col gap-2 overflow-y-auto">
          {toasts.map((toast) => {
            const cfg = toastConfig[toast.severity as 'WARN' | 'CRIT'] ?? toastConfig.WARN;
            const { Icon } = cfg;
            return (
              <div
                key={toast.id}
                className={`shadow-theme-lg flex shrink-0 items-start gap-3 rounded-xl border p-4 transition-colors duration-150 ${cfg.bg} ${cfg.border}`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${cfg.icon_c}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${cfg.title_c}`}>{toast.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{toast.message}</p>
                  {toast.rackId && (
                    <button
                      onClick={() => goToRack(toast)}
                      className={`mt-1.5 flex items-center gap-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100 ${cfg.title_c}`}
                    >
                      <ArrowRight className="h-3 w-3" />
                      {toast.rackName}
                    </button>
                  )}
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
      </div>
    );
  }

  if (isStacked) {
    const mainToast = toasts[toasts.length - 1];
    const cfg = toastConfig[mainToast.severity as 'WARN' | 'CRIT'] ?? toastConfig.WARN;
    const { Icon } = cfg;
    // Cap at 2 ghost layers — more than that gives diminishing visual returns
    const ghostLayers = Math.min(toasts.length - 1, 2);
    // Ghost direction flips so they peek away from the screen edge
    const isTop = features.toast_position === 'top-right';

    return (
      <div className={`fixed z-[9999] ${positionClass} flex flex-col items-end gap-2`}>
        {/* Relative container needed to position ghost cards with absolute offsets */}
        <div className="relative w-80">
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
          {ghostLayers >= 1 && (
            <div
              className={`absolute inset-0 rounded-xl border ${cfg.bg} ${cfg.border} opacity-55`}
              style={{
                transform: isTop ? 'translateY(5px) scaleX(0.94)' : 'translateY(-5px) scaleX(0.94)',
                transformOrigin: 'center',
                zIndex: 2,
              }}
            />
          )}
          <div
            className={`shadow-theme-lg relative flex items-start gap-3 rounded-xl border p-4 transition-colors duration-150 ${cfg.bg} ${cfg.border}`}
            style={{ zIndex: 10 }}
          >
            <Icon className={`h-5 w-5 shrink-0 ${cfg.icon_c}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${cfg.title_c}`}>{mainToast.title}</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{mainToast.message}</p>
              {mainToast.rackId && (
                <button
                  onClick={() => goToRack(mainToast)}
                  className={`mt-1.5 flex items-center gap-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100 ${cfg.title_c}`}
                >
                  <ArrowRight className="h-3 w-3" />
                  {mainToast.rackName}
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(mainToast.id)}
              className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex w-80 items-center justify-between px-1 text-xs">
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white/90 px-2.5 py-1 font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <span>
              {toasts.length} alert{toasts.length !== 1 ? 's' : ''}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            onClick={dismissAll}
            className="rounded-lg px-2.5 py-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            Dismiss all
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rs-scrollbar fixed z-[9999] ${positionClass} flex w-80 flex-col gap-2 overflow-y-auto`}
      style={{ maxHeight: 'calc(100vh - 32px)' }}
    >
      {toasts.map((toast) => {
        const cfg = toastConfig[toast.severity as 'WARN' | 'CRIT'] ?? toastConfig.WARN;
        const { Icon } = cfg;
        return (
          <div
            key={toast.id}
            className={`shadow-theme-lg flex w-80 items-start gap-3 rounded-xl border p-4 transition-colors duration-150 ${cfg.bg} ${cfg.border}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${cfg.icon_c}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${cfg.title_c}`}>{toast.title}</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{toast.message}</p>
              {toast.rackId && (
                <button
                  onClick={() => goToRack(toast)}
                  className={`mt-1.5 flex items-center gap-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100 ${cfg.title_c}`}
                >
                  <ArrowRight className="h-3 w-3" />
                  {toast.rackName}
                </button>
              )}
            </div>
            <button onClick={() => dismiss(toast.id)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
