import type { ElementType } from 'react';

export type FilterOption = { label: string; value: string };

export const FilterPills = ({
  options,
  value,
  onChange,
  icon: Icon,
}: {
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
  icon?: ElementType;
}) => (
  <div className="flex h-9 items-center gap-0.5 rounded-lg border border-gray-200 px-1.5 dark:border-gray-700">
    {Icon && <Icon className="mr-1 h-3.5 w-3.5 shrink-0 text-gray-400" />}
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
          value === opt.value
            ? 'bg-brand-500 text-white'
            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
