// ── Types ─────────────────────────────────────────────────────────────────────

export type TimelineItem = {
  id: string;
  title: string;
  description?: string;
  time: string;
  /** Hex color for dot / card border. Defaults to brand color CSS variable. */
  dotColor?: string;
  /** Avatar variant: initials + tailwind bg class */
  avatar?: { initials: string; bg: string };
};

export type TimelineVariant = 'dot' | 'avatar' | 'card';

type TimelineProps = {
  items: TimelineItem[];
  variant?: TimelineVariant;
};

// ── Variants ──────────────────────────────────────────────────────────────────

const DEFAULT_DOT_COLOR = '#6b7280';

function DotTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative space-y-0">
      <div className="absolute top-3.5 left-3.5 h-[calc(100%-28px)] w-0.5 bg-gray-200 dark:bg-gray-800" />
      {items.map((item) => (
        <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white dark:border-gray-900 dark:bg-gray-900">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.dotColor ?? DEFAULT_DOT_COLOR }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{item.time}</span>
            </div>
            {item.description && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AvatarTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative space-y-0">
      <div className="absolute top-4 left-4 h-[calc(100%-32px)] w-0.5 bg-gray-200 dark:bg-gray-800" />
      {items.map((item) => (
        <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          <div
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${item.avatar?.bg ?? 'bg-gray-500'}`}
          >
            {item.avatar?.initials ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{item.time}</span>
            </div>
            {item.description && (
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CardTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
          style={{ borderLeftWidth: 3, borderLeftColor: item.dotColor ?? DEFAULT_DOT_COLOR }}
        >
          {item.avatar && (
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${item.avatar.bg}`}
            >
              {item.avatar.initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.title}
              </span>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{item.time}</span>
            </div>
            {item.description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Timeline = ({ items, variant = 'dot' }: TimelineProps) => {
  if (variant === 'avatar') return <AvatarTimeline items={items} />;
  if (variant === 'card') return <CardTimeline items={items} />;
  return <DotTimeline items={items} />;
};
