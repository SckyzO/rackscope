import type { ReactNode } from 'react';

export const KpiCard = ({
  label,
  value,
  sub,
  className = '',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900 ${className}`}
  >
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    {sub && <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-600">{sub}</p>}
  </div>
);
