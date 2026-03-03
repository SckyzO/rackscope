export const STATUS_COLOR: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

type StatusDotSize = 'sm' | 'md' | 'lg';

const SIZE: Record<StatusDotSize, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export const StatusDot = ({
  status,
  pulse = false,
  size = 'md',
}: {
  status: string;
  pulse?: boolean;
  size?: StatusDotSize;
}) => {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.UNKNOWN;
  return (
    <span className={`relative flex shrink-0 ${SIZE[size]}`}>
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
};
