export type SelectOption = { label: string; value: string };

export const SelectInput = ({
  value,
  onChange,
  options,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`focus:border-brand-500 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 ${className}`}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);
