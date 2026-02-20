import React from 'react';

interface FormToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const FormToggle: React.FC<FormToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex-1">
        <label
          className="block text-xs font-bold tracking-wider uppercase"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        style={
          {
            backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-border)',
            '--tw-ring-color': 'var(--color-accent)',
          } as React.CSSProperties
        }
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
          style={{ backgroundColor: 'var(--color-text-inverse)' }}
        />
      </button>
    </div>
  );
};
