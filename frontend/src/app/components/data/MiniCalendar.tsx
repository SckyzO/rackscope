import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

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

// Mon-first ISO week
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

type Cell = {
  day: number;
  current: boolean;
  /** ISO date string used as stable React key */
  dateStr: string;
};

function buildCells(year: number, month: number): Cell[] {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon-first offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  const cells: Cell[] = [];

  // Trailing days from previous month
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ day: d, current: false, dateStr: toDateStr(prevYear, prevMonth, d) });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true, dateStr: toDateStr(year, month, i) });
  }

  // Leading days from next month
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, current: false, dateStr: toDateStr(nextYear, nextMonth, nextDay) });
    nextDay++;
  }

  return cells;
}

// ── Component ─────────────────────────────────────────────────────────────────

export type MiniCalendarProps = {
  /** Reference date for highlighting "today". Defaults to `new Date()`. */
  today?: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  /** ISO date strings (YYYY-MM-DD) that should show an event dot */
  eventDays?: Set<string>;
};

export const MiniCalendar = ({
  today: todayProp,
  selected,
  onSelect,
  eventDays,
}: MiniCalendarProps) => {
  const today = todayProp ?? new Date();
  const [view, setView] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const year = view.getFullYear();
  const month = view.getMonth();

  const cells = buildCells(year, month);

  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const isSelected = (d: number) =>
    selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setView(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="hover:text-brand-500 dark:hover:text-brand-400 text-sm font-semibold text-gray-900 transition-colors dark:text-white"
        >
          {MONTHS[month]} {year}
        </button>
        <button
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAYS.map((d, i) => (
          <div
            key={i} // eslint-disable-line react/no-array-index-key
            className="py-1 text-center text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells — keyed by absolute ISO date string, never by array index */}
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const today_ = isToday(cell.day) && cell.current;
          const selected_ = isSelected(cell.day) && cell.current;
          const hasEvents = cell.current && (eventDays?.has(cell.dateStr) ?? false);

          const circleCls =
            today_ && selected_
              ? 'bg-brand-500 text-white font-semibold'
              : selected_
                ? 'bg-brand-500 text-white'
                : today_
                  ? 'text-brand-600 font-semibold ring-1 ring-brand-500 dark:text-brand-400 dark:ring-brand-400'
                  : cell.current
                    ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                    : 'text-gray-300 dark:text-gray-600';

          return (
            <div key={cell.dateStr} className="flex flex-col items-center py-0.5">
              <button
                disabled={!cell.current}
                onClick={() => cell.current && onSelect(new Date(year, month, cell.day))}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${circleCls} ${!cell.current ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {cell.day}
              </button>
              {/* Event dot */}
              <div
                className={`mt-0.5 h-1 w-1 rounded-full transition-opacity ${hasEvents ? 'bg-brand-500 dark:bg-brand-400' : 'opacity-0'}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
