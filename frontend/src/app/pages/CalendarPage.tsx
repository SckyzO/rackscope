import { useState } from 'react';
import { Plus, Clock, Wrench } from 'lucide-react';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '@app/pages/templates/EmptyPage';
import { PageActionButton } from '@app/components/PageActionButton';
import { EmptyState } from '@app/components/feedback/EmptyState';
import { MiniCalendar } from '@app/components/data/MiniCalendar';

// ── Types ─────────────────────────────────────────────────────────────────────

type CalEvent = {
  id: string;
  label: string;
  time?: string;
  color: string; // Tailwind bg class
  dotColor: string; // Tailwind bg class for left bar
  type: 'event' | 'maintenance';
};

// ── Sample events (hardcoded — replace with API when ready) ───────────────────

const EVENTS: Record<string, CalEvent[]> = {
  '2026-02-05': [
    {
      id: 'e1',
      label: 'Team standup',
      time: '09:00',
      color: 'bg-brand-50 dark:bg-brand-500/10',
      dotColor: 'bg-brand-500',
      type: 'event',
    },
  ],
  '2026-02-10': [
    {
      id: 'e2',
      label: 'Product review',
      time: '14:00',
      color: 'bg-green-50 dark:bg-green-500/10',
      dotColor: 'bg-green-500',
      type: 'event',
    },
    {
      id: 'e3',
      label: 'Lunch 1:1',
      time: '12:30',
      color: 'bg-amber-50 dark:bg-amber-500/10',
      dotColor: 'bg-amber-400',
      type: 'event',
    },
  ],
  '2026-02-15': [
    {
      id: 'e4',
      label: 'Release v2.0',
      time: '10:00',
      color: 'bg-red-50 dark:bg-red-500/10',
      dotColor: 'bg-red-500',
      type: 'event',
    },
  ],
  '2026-02-20': [
    {
      id: 'e5',
      label: 'Sprint planning',
      time: '09:30',
      color: 'bg-brand-50 dark:bg-brand-500/10',
      dotColor: 'bg-brand-500',
      type: 'event',
    },
  ],
  '2026-02-25': [
    {
      id: 'e6',
      label: 'All-hands meeting',
      time: '11:00',
      color: 'bg-green-50 dark:bg-green-500/10',
      dotColor: 'bg-green-500',
      type: 'event',
    },
  ],
};

const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// ── Event list for selected day ────────────────────────────────────────────────

function EventList({ date, events }: { date: Date; events: CalEvent[] }) {
  const label = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 ? (
          <EmptyState
            title="No events"
            description="Nothing scheduled for this day."
            icon={Clock}
          />
        ) : (
          <ol className="space-y-3">
            {events
              .slice()
              .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
              .map((ev) => (
                <li key={ev.id} className={`flex gap-3 rounded-xl p-3 ${ev.color}`}>
                  <div className={`mt-0.5 w-1 shrink-0 rounded-full ${ev.dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white">
                      {ev.label}
                    </p>
                    {ev.time && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        {ev.type === 'maintenance' ? (
                          <Wrench className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {ev.time}
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export const CalendarPage = () => {
  usePageTitle('Calendar');

  const today = new Date();
  const [selected, setSelected] = useState(today);

  const selectedStr = toDateStr(selected.getFullYear(), selected.getMonth(), selected.getDate());
  const dayEvents = EVENTS[selectedStr] ?? [];
  const eventDays = new Set(Object.keys(EVENTS));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Manage your schedule and events"
        breadcrumb={
          <PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Calendar' }]} />
        }
        actions={
          <PageActionButton icon={Plus} variant="primary">
            Add Event
          </PageActionButton>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Mini calendar */}
        <div className="w-full lg:w-72 lg:shrink-0">
          <MiniCalendar
            today={today}
            selected={selected}
            onSelect={setSelected}
            eventDays={eventDays}
          />
        </div>

        {/* Events panel */}
        <div className="flex min-h-[360px] flex-1">
          <EventList date={selected} events={dayEvents} />
        </div>
      </div>
    </div>
  );
};
