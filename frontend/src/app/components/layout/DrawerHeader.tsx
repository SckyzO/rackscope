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
  <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
    <div className="flex items-center gap-2.5">
      {Icon && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-white">{title}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
    <button
      onClick={onClose}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);
