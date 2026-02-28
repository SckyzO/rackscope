import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SettingTooltip } from '../../../app/components/SettingTooltip';

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  tooltip?: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  tooltip,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
        {label}
        {tooltip && <SettingTooltip text={tooltip} />}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-700 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-brand-400"
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom arrow — replaces native browser arrow */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
};
