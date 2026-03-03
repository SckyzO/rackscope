/**
 * FormRow — horizontal setting row: label (+ optional description) on the left,
 * control (input, toggle, select…) on the right.
 *
 * Usage:
 *   <FormRow label="Auto-refresh" description="Reload data automatically">
 *     <ToggleSwitch checked={enabled} onChange={toggle} />
 *   </FormRow>
 *
 *   <FormRow label="Refresh interval">
 *     <SelectInput value={interval} onChange={setInterval} options={opts} />
 *   </FormRow>
 */

import type { ReactNode } from 'react';

export const FormRow = ({
  label,
  description,
  children,
  className = '',
}: {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`flex items-center justify-between gap-4 ${className}`}>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {description && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);
