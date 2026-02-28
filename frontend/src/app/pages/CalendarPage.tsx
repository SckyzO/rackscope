import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const events: Record<string, { label: string; color: string }[]> = {
  '2026-02-05': [{ label: 'Team standup', color: 'bg-brand-500' }],
  '2026-02-10': [
    { label: 'Product review', color: 'bg-success-500' },
    { label: 'Lunch 1:1', color: 'bg-warning-500' },
  ],
  '2026-02-15': [{ label: 'Release v2.0', color: 'bg-error-500' }],
  '2026-02-20': [{ label: 'Sprint planning', color: 'bg-brand-500' }],
  '2026-02-25': [{ label: 'All-hands meeting', color: 'bg-success-500' }],
};

export const CalendarPage = () => {
  const today = new Date(2026, 1, 20); // Feb 20, 2026 (project date)
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calendar</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your schedule and events
          </p>
        </div>
        <button className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> Add Event
        </button>
      </div>

      <div className="shadow-theme-sm overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {MONTHS[month]} {year}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrent(new Date(year, month - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Today
            </button>
            <button
              onClick={() => setCurrent(new Date(year, month + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-3 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
            const dayEvents = cell.current ? events[dateStr] || [] : [];
            const isToday =
              cell.current &&
              year === today.getFullYear() &&
              month === today.getMonth() &&
              cell.day === today.getDate();

            return (
              <div
                key={idx}
                className={`min-h-[80px] border-r border-b border-gray-100 p-2 last:border-r-0 dark:border-gray-800 ${!cell.current ? 'bg-gray-50/50 dark:bg-gray-800/30' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
              >
                <div
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${isToday ? 'bg-brand-500 text-white' : cell.current ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}
                >
                  {cell.day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.map((ev, i) => (
                    <div
                      key={i}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${ev.color}`}
                    >
                      {ev.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
