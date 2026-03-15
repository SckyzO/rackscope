import type { ElementType, ReactNode } from 'react';

export type TabItem = {
  id: string;
  label: string;
  icon?: ElementType;
  badge?: ReactNode;
};

export const Tabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) => (
  <div className="border-b border-gray-200 dark:border-gray-800">
    <div className="-mb-px flex">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {t.label}
            {t.badge !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);
