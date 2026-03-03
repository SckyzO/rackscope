/**
 * StepperInput — number field with ↑ / ↓ arrows embedded inside the right edge.
 *
 *  ┌────────────────────────┐
 *  │  60           s  │ ↑  │
 *  │                  │ ↓  │
 *  └────────────────────────┘
 *
 * Use this for compact settings fields where the value is typed or
 * incremented in-place (e.g. "Room State Refresh (seconds)").
 *
 * Usage:
 *   <StepperInput value={interval} onChange={setInterval} min={5} max={3600} step={5} unit="s" />
 *   <StepperInput value={zoom} onChange={setZoom} min={1} max={18} />
 *
 * Props:
 *   value    — controlled number value
 *   onChange — called with the new clamped number
 *   min / max / step — applied on every change
 *   unit     — optional suffix shown inside the field (e.g. "s", "ms", "%")
 *   disabled — disables all interaction
 *   className — extra classes on the wrapper (e.g. "w-32")
 */

import { ChevronUp, ChevronDown } from 'lucide-react';

export const StepperInput = ({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  unit,
  disabled = false,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const arrowBtn = `flex flex-1 items-center justify-center px-1.5 transition-colors
    hover:bg-gray-50 dark:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40`;

  return (
    <div
      className={`flex h-9 overflow-hidden rounded-lg border border-gray-200 bg-white
        dark:border-gray-700 dark:bg-gray-800
        ${disabled ? 'opacity-50' : ''}
        ${className}`}
    >
      {/* Text input — hides native spinners */}
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(clamp(n));
        }}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className="
          h-full flex-1 bg-transparent pl-3 pr-1 text-sm font-medium
          text-gray-700 focus:outline-none disabled:cursor-not-allowed
          dark:text-gray-200
          [appearance:textfield]
          [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-outer-spin-button]:appearance-none
        "
      />

      {/* Unit suffix */}
      {unit && (
        <span className="flex items-center pr-1.5 text-xs text-gray-400 dark:text-gray-500 select-none">
          {unit}
        </span>
      )}

      {/* Stacked ↑ / ↓ buttons */}
      <div className="flex flex-col border-l border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled || value >= max}
          tabIndex={-1}
          aria-label="Increase"
          className={arrowBtn}
        >
          <ChevronUp className="h-3.5 w-3.5 font-bold text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled || value <= min}
          tabIndex={-1}
          aria-label="Decrease"
          className={`border-t border-gray-200 dark:border-gray-700 ${arrowBtn}`}
        >
          <ChevronDown className="h-3.5 w-3.5 font-bold text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
