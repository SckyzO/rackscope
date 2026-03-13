import type { ReactNode } from 'react';
import { InboxIcon } from 'lucide-react';
import type { ElementType } from 'react';

export const EmptyState = ({
  title = 'No data',
  description,
  icon: Icon = InboxIcon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ElementType;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12">
    <Icon className="h-10 w-10 text-gray-200 dark:text-gray-700" />
    <div className="text-center">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">{description}</p>
      )}
    </div>
    {action}
  </div>
);
