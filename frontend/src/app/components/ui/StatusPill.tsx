/* eslint-disable react-refresh/only-export-components */
export type HealthStatus = 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';

export const HEALTH_STATUS_PILL: Record<HealthStatus, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

type StatusPillSize = 'sm' | 'md' | 'lg';

const SIZE: Record<StatusPillSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export const StatusPill = ({
  status,
  size = 'md',
  className = '',
}: {
  status: HealthStatus | string;
  size?: StatusPillSize;
  className?: string;
}) => {
  const pillCls = HEALTH_STATUS_PILL[status as HealthStatus] ?? HEALTH_STATUS_PILL.UNKNOWN;
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${SIZE[size]} ${pillCls} ${className}`}>
      {status}
    </span>
  );
};
