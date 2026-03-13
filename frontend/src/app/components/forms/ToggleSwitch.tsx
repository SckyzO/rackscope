export const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}) => (
  <div className="flex items-center gap-2.5">
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${checked ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
    {label && <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>}
  </div>
);
