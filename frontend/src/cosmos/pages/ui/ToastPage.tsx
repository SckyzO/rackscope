import { useState, useCallback } from 'react';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

type ToastType = 'success' | 'info' | 'warning' | 'error';
type ToastPos = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
  position: ToastPos;
  action?: string;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-success-50 dark:bg-success-500/10',
    border: 'border-success-200 dark:border-success-500/30',
    icon_c: 'text-success-500',
    title_c: 'text-success-700 dark:text-success-400',
  },
  info: {
    icon: Info,
    bg: 'bg-brand-50 dark:bg-brand-500/10',
    border: 'border-brand-200 dark:border-brand-500/30',
    icon_c: 'text-brand-500',
    title_c: 'text-brand-700 dark:text-brand-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning-50 dark:bg-warning-500/10',
    border: 'border-warning-200 dark:border-warning-500/30',
    icon_c: 'text-warning-500',
    title_c: 'text-warning-700 dark:text-warning-400',
  },
  error: {
    icon: XCircle,
    bg: 'bg-error-50 dark:bg-error-500/10',
    border: 'border-error-200 dark:border-error-500/30',
    icon_c: 'text-error-500',
    title_c: 'text-error-700 dark:text-error-400',
  },
};

const posClass: Record<ToastPos, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

let nextId = 1;

export const ToastPage = () => {
  usePageTitle('Toast');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [position, setPosition] = useState<ToastPos>('top-right');

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (type: ToastType, withAction = false) => {
      const id = nextId++;
      const msgs: Record<ToastType, [string, string]> = {
        success: ['Action completed', 'Your changes have been saved successfully.'],
        info: ['New information', 'Check out the latest updates to your dashboard.'],
        warning: ['Double check required', 'Please review your information before submitting.'],
        error: ['Something went wrong', 'An error occurred while processing your request.'],
      };
      setToasts((t) => [
        ...t,
        {
          id,
          type,
          title: msgs[type][0],
          message: msgs[type][1],
          position,
          action: withAction ? 'Undo' : undefined,
        },
      ]);
      setTimeout(() => dismiss(id), 4000);
    },
    [position, dismiss]
  );

  const positionGroups = (toasts: Toast[]) => {
    const groups: Partial<Record<ToastPos, Toast[]>> = {};
    toasts.forEach((t) => {
      if (!groups[t.position]) groups[t.position] = [];
      (groups[t.position] as Toast[]).push(t);
    });
    return groups;
  };

  const groups = positionGroups(toasts);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Toast Notifications"
        description="Positioned toast notification system"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'UI Library', href: '/cosmos/ui' },
              { label: 'Toast' },
            ]}
          />
        }
      />

      {/* Toast containers */}
      {Object.entries(groups).map(([pos, posToasts]) => (
        <div
          key={pos}
          className={`fixed z-[9999] flex flex-col gap-2 ${posClass[pos as ToastPos]}`}
        >
          {(posToasts as Toast[]).map((t) => {
            const cfg = toastConfig[t.type];
            const Icon = cfg.icon;
            return (
              <div
                key={t.id}
                className={`shadow-theme-lg flex w-80 items-start gap-3 rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${cfg.icon_c}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${cfg.title_c}`}>{t.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{t.message}</p>
                  {t.action && (
                    <button className={`mt-2 text-xs font-semibold ${cfg.icon_c} hover:underline`}>
                      {t.action}
                    </button>
                  )}
                </div>
                <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ))}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Toast Types" desc="Click to trigger each type">
          <div className="flex flex-wrap gap-3">
            {(['success', 'info', 'warning', 'error'] as ToastType[]).map((type) => (
              <button
                key={type}
                onClick={() => show(type)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 capitalize hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              >
                {type}
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Position" desc="Choose toast placement corner">
          <div className="flex flex-wrap gap-2">
            {(['top-right', 'top-left', 'bottom-right', 'bottom-left'] as ToastPos[]).map((pos) => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${position === pos ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'}`}
              >
                {pos}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Selected: <span className="text-brand-500 font-semibold">{position}</span>
          </p>
        </SectionCard>
        <SectionCard title="With Action" desc="Toast with an undo button">
          <button
            onClick={() => show('success', true)}
            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            Show with Undo action
          </button>
        </SectionCard>
        <SectionCard title="Toast Showcase (Static)" desc="All types displayed statically">
          <div className="space-y-3">
            {(['success', 'info', 'warning', 'error'] as ToastType[]).map((type) => {
              const cfg = toastConfig[type];
              const Icon = cfg.icon;
              return (
                <div
                  key={type}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${cfg.icon_c}`} />
                  <div>
                    <p className={`text-xs font-semibold ${cfg.title_c} capitalize`}>{type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Example {type} notification message
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
