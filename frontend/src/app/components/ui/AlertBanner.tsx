import type { ReactNode } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ElementType } from 'react';

export type AlertBannerVariant = 'success' | 'error' | 'warning' | 'info';

const VARIANTS: Record<AlertBannerVariant, {
  border: string; bg: string; icon: ElementType; iconCls: string; text: string;
}> = {
  success: {
    border: 'border-green-200 dark:border-green-500/20',
    bg: 'bg-green-50 dark:bg-green-500/10',
    icon: CheckCircle,
    iconCls: 'text-green-500',
    text: 'text-green-700 dark:text-green-400',
  },
  error: {
    border: 'border-red-200 dark:border-red-500/20',
    bg: 'bg-red-50 dark:bg-red-500/10',
    icon: AlertCircle,
    iconCls: 'text-red-500',
    text: 'text-red-700 dark:text-red-400',
  },
  warning: {
    border: 'border-amber-200 dark:border-amber-500/20',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    icon: AlertTriangle,
    iconCls: 'text-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    border: 'border-blue-200 dark:border-blue-500/20',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    icon: Info,
    iconCls: 'text-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
  },
};

export const AlertBanner = ({
  variant = 'info',
  children,
}: {
  variant?: AlertBannerVariant;
  children: ReactNode;
}) => {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 ${v.border} ${v.bg}`}>
      <Icon className={`h-4 w-4 shrink-0 ${v.iconCls}`} />
      <p className={`text-sm font-medium ${v.text}`}>{children}</p>
    </div>
  );
};
