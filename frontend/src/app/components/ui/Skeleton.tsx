// ── Primitive ─────────────────────────────────────────────────────────────────

export const Sk = ({
  h = 'h-4',
  w = 'w-full',
  round = 'rounded',
  className = '',
}: {
  h?: string;
  w?: string;
  round?: string;
  className?: string;
}) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${h} ${w} ${round} ${className}`} />
);

// ── Preset: text paragraph ────────────────────────────────────────────────────

export const SkeletonText = ({ lines = 4 }: { lines?: number }) => (
  <div className="space-y-3">
    <Sk h="h-5" w="w-3/4" />
    {Array.from({ length: lines - 1 }).map((_, i) => (
      <Sk
        key={i} // eslint-disable-line react/no-array-index-key
        h="h-4"
        w={['w-full', 'w-5/6', 'w-4/6', 'w-2/3'][i % 4]}
      />
    ))}
  </div>
);

// ── Preset: table rows ────────────────────────────────────────────────────────

export const SkeletonTable = ({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
    {/* Header */}
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Sk key={i} h="h-3" w="w-3/4" /> // eslint-disable-line react/no-array-index-key
        ))}
      </div>
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, row) => (
      <div
        key={row} // eslint-disable-line react/no-array-index-key
        className="border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Sk
              key={col} // eslint-disable-line react/no-array-index-key
              h="h-3"
              w={col === 0 ? 'w-full' : col === cols - 1 ? 'w-1/2' : 'w-5/6'}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── Preset: list rows (icon + content + optional action) ──────────────────────

export const SkeletonList = ({
  rows = 4,
  showAction = true,
}: {
  rows?: number;
  showAction?: boolean;
}) => (
  <div className="animate-pulse space-y-0">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i} // eslint-disable-line react/no-array-index-key
        className="flex items-start gap-3 border-b border-gray-100 px-4 py-3.5 last:border-0 dark:border-gray-800"
      >
        {/* Icon placeholder */}
        <Sk h="h-9" w="w-9" round="rounded-xl" />

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <Sk h="h-3.5" w="w-16" round="rounded-full" />
            <Sk h="h-4" w="w-32" />
            <Sk h="h-5" w="w-14" round="rounded-full" />
          </div>
          <Sk h="h-3.5" w={i % 2 === 0 ? 'w-2/3' : 'w-1/2'} />
          <Sk h="h-3" w="w-40" />
        </div>

        {/* Action placeholder */}
        {showAction && <Sk h="h-8" w="w-16" round="rounded-lg" className="shrink-0" />}
      </div>
    ))}
  </div>
);
