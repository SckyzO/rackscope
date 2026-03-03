import type { ElementType } from 'react';

export type SegmentOption<T extends string> = {
  label: string;
  value: T;
  icon?: ElementType;
};

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
    {options.map((opt, i) => {
      const Icon = opt.icon;
      const isActive = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            i > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''
          } ${
            isActive
              ? 'bg-brand-500 text-white'
              : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
          }`}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {opt.label}
        </button>
      );
    })}
  </div>
);
