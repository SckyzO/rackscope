/**
 * PageActionButton — standard action button for page headers
 *
 * Three variants:
 *   outline       (default) — border-gray-200 bg-white text-gray-600        → Configure, Edit, Back…
 *   primary               — bg-brand-500 text-white                         → New, Save, Create…
 *   brand-outline         — bg-brand-50 border-brand-200 text-brand-600     → Edit layout, highlight action
 *   danger-outline        — border-red-200 bg-white text-red-600            → Delete, destructive
 *
 * Usage:
 *   <PageActionButton icon={SlidersHorizontal} onClick={openConfig}>Configure</PageActionButton>
 *   <PageActionButton variant="primary" icon={Plus} onClick={create}>New rack</PageActionButton>
 */

import type { ReactNode, ElementType } from 'react';

export type PageActionButtonVariant = 'outline' | 'primary' | 'brand-outline' | 'danger-outline';

const VARIANT_CLS: Record<PageActionButtonVariant, string> = {
  outline:
    'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
  primary:
    'border-transparent bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600',
  'brand-outline':
    'border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20',
  'danger-outline':
    'border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10',
};

export const PageActionButton = ({
  icon: Icon,
  onClick,
  children,
  disabled = false,
  variant = 'outline',
  type = 'button',
  title,
}: {
  icon?: ElementType;
  onClick?: () => void;
  children?: ReactNode;
  disabled?: boolean;
  variant?: PageActionButtonVariant;
  type?: 'button' | 'submit';
  title?: string;
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLS[variant]}`}
  >
    {Icon && <Icon className="h-4 w-4 shrink-0" />}
    {children}
  </button>
);

/**
 * PageActionIconButton — icon-only variant (square, no label)
 *
 * Usage:
 *   <PageActionIconButton icon={SlidersHorizontal} title="Configure" onClick={open} />
 */
export const PageActionIconButton = ({
  icon: Icon,
  onClick,
  disabled = false,
  variant = 'outline',
  title,
}: {
  icon: ElementType;
  onClick?: () => void;
  disabled?: boolean;
  variant?: PageActionButtonVariant;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex items-center justify-center rounded-lg border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLS[variant]}`}
  >
    <Icon className="h-4 w-4" />
  </button>
);
