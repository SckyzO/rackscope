/**
 * Dropdown — trigger button + floating menu.
 *
 * Usage:
 *   <Dropdown
 *     label="All rooms"
 *     options={[{ value: 'all', label: 'All rooms' }, { value: 'dc1-a', label: 'DC1 / Room A' }]}
 *     value={room}
 *     onChange={setRoom}
 *   />
 *
 * With icon:
 *   <Dropdown label="Filter" icon={Filter} options={...} value={...} onChange={...} />
 */

import { useState, useRef, useEffect } from 'react';
import type { ElementType } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type DropdownOption = {
  value: string;
  label: string;
  icon?: ElementType;
  disabled?: boolean;
};

export const Dropdown = ({
  label,
  icon: TriggerIcon,
  options,
  value,
  onChange,
  placeholder,
  align = 'left',
  disabled = false,
  className = '',
}: {
  label?: string;
  icon?: ElementType;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  /** Shown when no value selected */
  placeholder?: string;
  /** Menu alignment relative to trigger */
  align?: 'left' | 'right';
  disabled?: boolean;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder ?? label ?? 'Select…';

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${
          open ? 'ring-brand-500/30 ring-2' : ''
        }`}
      >
        {TriggerIcon && <TriggerIcon className="h-4 w-4 shrink-0 text-gray-400" />}
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    onChange?.(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0 text-gray-400" />}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && <Check className="text-brand-500 h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
