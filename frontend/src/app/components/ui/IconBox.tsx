import type { ElementType } from 'react';

type IconBoxSize = 'sm' | 'md' | 'lg';

const BOX_SIZE: Record<IconBoxSize, string> = {
  sm: 'h-7 w-7 rounded-md',
  md: 'h-8 w-8 rounded-lg',
  lg: 'h-10 w-10 rounded-xl',
};

const ICON_SIZE: Record<IconBoxSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const IconBox = ({
  icon: Icon,
  size = 'md',
  bg = 'bg-gray-100 dark:bg-gray-800',
  color = 'text-gray-500 dark:text-gray-400',
}: {
  icon: ElementType;
  size?: IconBoxSize;
  bg?: string;
  color?: string;
}) => (
  <div className={`flex shrink-0 items-center justify-center ${BOX_SIZE[size]} ${bg}`}>
    <Icon className={`${ICON_SIZE[size]} ${color}`} />
  </div>
);
