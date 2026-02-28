import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * SettingTooltip — small (?) icon that shows a description on hover.
 * Uses CSS group-hover (no JS state), same pattern as /ui/tooltips.
 * Position: right of the trigger by default, adjustable via `position` prop.
 */
export const SettingTooltip = ({
  text,
  position = 'right',
}: {
  text: string;
  position?: 'right' | 'top' | 'left';
}) => {
  const posClass =
    position === 'top'
      ? 'bottom-full left-1/2 mb-2 -translate-x-1/2'
      : position === 'left'
        ? 'right-full top-1/2 mr-2 -translate-y-1/2'
        : 'left-full top-1/2 ml-2 -translate-y-1/2'; // right (default)

  return (
    <div className="group relative inline-flex items-center">
      <HelpCircle className="h-3.5 w-3.5 cursor-help text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
      <div
        className={`pointer-events-none invisible absolute z-50 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:visible dark:bg-gray-700 ${posClass}`}
      >
        {text}
      </div>
    </div>
  );
};

/**
 * SettingField — uniform wrapper for a settings form field.
 * Provides: label + optional tooltip + input slot.
 *
 * Usage:
 *   <SettingField label="Prometheus URL" tooltip="URL of your Prometheus instance.">
 *     <input ... />
 *   </SettingField>
 */
export const SettingField = ({
  label,
  tooltip,
  hint,
  required,
  children,
}: {
  label: string;
  tooltip?: string;
  hint?: string;           // Small helper text below the input
  required?: boolean;
  children: ReactNode;
}) => (
  <div>
    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {required && <span className="text-error-500 ml-0.5">*</span>}
      {tooltip && <SettingTooltip text={tooltip} />}
    </label>
    {children}
    {hint && (
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    )}
  </div>
);
