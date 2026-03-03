import type { ElementType } from 'react';
import { X } from 'lucide-react';

export const DrawerHeader = ({
  title,
  icon: Icon,
  onClose,
  description,
}: {
  title: string;
  icon?: ElementType;
  onClose: () => void;
  description?: string;
}) => (
  <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
    <div className="flex items-center gap-2.5">
      {Icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
    <button
      onClick={onClose}
      className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
    >
      <X className="h-5 w-5" />
    </button>
  </div>
);
