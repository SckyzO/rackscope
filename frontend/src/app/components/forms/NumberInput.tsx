/**
 * NumberInput — styled number field with − / + buttons.
 * Replaces native <input type="number"> spinners for cross-browser consistency.
 *
 * Usage:
 *   <NumberInput value={60} onChange={setTtl} min={1} max={3600} step={1} unit="s" />
 *   <NumberInput value={zoom} onChange={setZoom} min={1} max={18} width="w-20" />
 *
 * Props:
 *   value    — controlled number value
 *   onChange — called with the new number
 *   min / max / step — clamped automatically
 *   unit     — optional suffix label (e.g. "s", "ms", "%")
 *   width    — Tailwind width class for the input (default: "w-20")
 *   disabled — disables all interaction
 */

export const NumberInput = ({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  unit,
  width = 'w-20',
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  width?: string;
  disabled?: boolean;
}) => {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const decrement = () => onChange(clamp(value - step));
  const increment = () => onChange(clamp(value + step));

  const handleInput = (raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(clamp(n));
  };

  const btnCls = `flex h-full items-center justify-center px-2 text-gray-400 transition-colors
    hover:bg-gray-50 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40
    dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-300`;

  return (
    <div
      className={`flex h-9 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {/* Decrement */}
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        className={`border-r border-gray-200 dark:border-gray-700 ${btnCls}`}
        tabIndex={-1}
        aria-label="Decrease"
      >
        <span className="text-base font-semibold leading-none text-gray-500 dark:text-gray-400">−</span>
      </button>

      {/* Input + optional unit */}
      <div className="flex items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`h-full border-0 bg-transparent text-center text-sm font-medium text-gray-700 focus:outline-none disabled:cursor-not-allowed dark:text-gray-200 ${width}
            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
        {unit && (
          <span className="pr-1.5 text-xs text-gray-400 dark:text-gray-500">{unit}</span>
        )}
      </div>

      {/* Increment */}
      <button
        type="button"
        onClick={increment}
        disabled={disabled || value >= max}
        className={`border-l border-gray-200 dark:border-gray-700 ${btnCls}`}
        tabIndex={-1}
        aria-label="Increase"
      >
        <span className="text-base font-semibold leading-none text-gray-500 dark:text-gray-400">+</span>
      </button>
    </div>
  );
};
