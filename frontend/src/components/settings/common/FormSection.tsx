import type { ReactNode, ElementType } from 'react';

type FormSectionProps = {
  title: string;
  description?: string;
  icon?: ElementType;
  iconColor?: string;
  iconBg?: string;
  children: ReactNode;
  className?: string;
  divider?: boolean; // kept for backward compat, no longer used (card handles separation)
}

/**
 * FormSection — renders as a SectionCard (bordered card with icon + title).
 * Matches the style of ViewsSettingsSection cards for consistency across all tabs.
 */
export const FormSection = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-gray-500 dark:text-gray-400',
  iconBg = 'bg-gray-100 dark:bg-gray-800',
  children,
  className = '',
}: FormSectionProps) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {/* Header with optional icon */}
      <div className="mb-5 flex items-center gap-3">
        {Icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
};
