import type { ReactNode } from 'react';

export const SectionLabel = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <p
    className={`text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600 ${className}`}
  >
    {children}
  </p>
);
