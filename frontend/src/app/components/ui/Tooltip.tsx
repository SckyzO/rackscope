/**
 * Tooltip — polished tooltip with arrow, fade transition and 3 variants.
 *
 * Usage — any trigger:
 *   <Tooltip content="Prometheus scrape interval in seconds">
 *     <HelpCircle className="h-4 w-4 text-gray-400" />
 *   </Tooltip>
 *
 * Usage — HelpCircle shortcut (replaces SettingTooltip):
 *   <TooltipHelp text="Prometheus scrape interval in seconds" />
 *
 * Positions: top (default) | bottom | left | right
 * Variants:  dark (default) | white | brand
 */

import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipVariant = 'dark' | 'white' | 'brand';

// ── Position: tooltip box placement ──────────────────────────────────────────

const BOX_POS: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2.5',
};

// ── Arrow: small rotated square at the edge facing the trigger ────────────────

const ARROW_POS: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2',
  left: 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2',
  right: 'right-full top-1/2 translate-x-1/2 -translate-y-1/2',
};

// ── Variant styles ─────────────────────────────────────────────────────────────

const VARIANT_BOX: Record<TooltipVariant, string> = {
  dark: 'bg-gray-900 text-white shadow-lg dark:bg-gray-700',
  white:
    'bg-white text-gray-700 border border-gray-200 shadow-lg dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
  brand: 'bg-brand-500 text-white shadow-lg',
};

// Arrow border color per variant (matching box edge)
const VARIANT_ARROW: Record<TooltipVariant, string> = {
  dark: 'bg-gray-900 dark:bg-gray-700',
  white: 'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700',
  brand: 'bg-brand-500',
};

// ── Component ──────────────────────────────────────────────────────────────────

export const Tooltip = ({
  content,
  children,
  position = 'top',
  variant = 'dark',
  maxWidth = 'max-w-xs',
}: {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  /** Tailwind max-width class — default "max-w-xs" (320px) */
  maxWidth?: string;
}) => (
  <div className="group relative inline-flex items-center">
    {children}

    {/* Tooltip box */}
    <div
      className={`pointer-events-none absolute z-50 w-max ${maxWidth} rounded-lg px-3 py-2
        text-xs leading-relaxed whitespace-normal
        opacity-0 transition-opacity duration-150 group-hover:opacity-100
        ${BOX_POS[position]} ${VARIANT_BOX[variant]}`}
      role="tooltip"
    >
      {content}

      {/* Arrow */}
      <span
        className={`absolute h-2 w-2 rotate-45 ${ARROW_POS[position]} ${VARIANT_ARROW[variant]}`}
      />
    </div>
  </div>
);

// ── TooltipHelp — HelpCircle shortcut (replaces SettingTooltip) ───────────────

export const TooltipHelp = ({
  text,
  position = 'top',
  variant = 'dark',
}: {
  text: string;
  position?: TooltipPosition;
  variant?: TooltipVariant;
}) => (
  <Tooltip content={text} position={position} variant={variant} maxWidth="max-w-[260px]">
    <HelpCircle
      className="h-3.5 w-3.5 cursor-help text-gray-400 transition-colors hover:text-gray-600
        dark:text-gray-500 dark:hover:text-gray-300"
    />
  </Tooltip>
);
