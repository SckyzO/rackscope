import React from 'react';
import { SettingTooltip } from '../../../app/components/SettingTooltip';

interface FormFieldProps {
  label: string;
  tooltip?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'password';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  tooltip,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">
        {label}
        {tooltip && <SettingTooltip text={tooltip} />}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-brand-400"
      />
    </div>
  );
};
