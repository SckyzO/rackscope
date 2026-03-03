import type { FC } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-10 w-10 border-4',
};

export const Spinner: FC<{ size?: SpinnerSize; className?: string }> = ({
  size = 'md',
  className = '',
}) => (
  <div
    className={`border-t-brand-500 dark:border-t-brand-500 animate-spin rounded-full border-gray-200 dark:border-gray-700 ${SIZE[size]} ${className}`}
  />
);
