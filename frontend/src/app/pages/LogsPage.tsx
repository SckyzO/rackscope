import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Download,
  Eraser,
  Pause,
  Play,
  RefreshCw,
  Search,
} from 'lucide-react';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader } from './templates/EmptyPage';
import { useAuth } from '@src/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'ALL';

type LogRecord = {
  _seq: number;
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  request_id?: string;
  duration_ms?: number;
  method?: string;
  path?: string;
  status_code?: number;
  exception?: string;
};

// ── Level styling ─────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, string> = {
  DEBUG: 'text-gray-400 dark:text-gray-500',
  INFO: 'text-blue-500 dark:text-blue-400',
  WARNING: 'text-amber-500 dark:text-amber-400',
  ERROR: 'text-red-500 dark:text-red-400',
  CRITICAL: 'text-red-700 dark:text-red-300 font-bold',
};

const LEVEL_BADGE: Record<string, string> = {
  DEBUG: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  INFO: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  WARNING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ERROR: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

// ── Log row component ─────────────────────────────────────────────────────────

const LogRow = ({ record }: { record: LogRecord }) => {
  const [expanded, setExpanded] = useState(false);
  const time = record.timestamp
    ? new Date(record.timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      })
    : '';
  const lvl = record.level?.toUpperCase() ?? 'INFO';
  const hasDetail = !!record.exception || !!record.request_id;

  return (
    <div
      className={`group border-b border-gray-100 px-3 py-1.5 font-mono text-xs dark:border-gray-800/60 ${
        expanded ? 'bg-gray-50 dark:bg-gray-800/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/20'
      }`}
    >
      <div
        className="flex cursor-pointer items-start gap-3"
        onClick={() => hasDetail && setExpanded((e) => !e)}
      >
        {/* Timestamp */}
        <span className="w-[100px] shrink-0 text-gray-400 dark:text-gray-500">{time}</span>

        {/* Level badge */}
        <span
          className={`w-16 shrink-0 rounded px-1 py-px text-center text-[10px] font-semibold uppercase ${
            LEVEL_BADGE[lvl] ?? LEVEL_BADGE.INFO
          }`}
        >
          {lvl}
        </span>

        {/* Logger */}
        <span className="w-48 shrink-0 truncate text-gray-400 dark:text-gray-500">
          {record.logger}
        </span>

        {/* Message */}
        <span className={`flex-1 break-all ${LEVEL_STYLES[lvl] ?? ''}`}>{record.message}</span>

        {/* Duration / status */}
        {record.duration_ms !== undefined && (
          <span className="ml-2 shrink-0 text-gray-400">{record.duration_ms.toFixed(1)}ms</span>
        )}
        {record.status_code !== undefined && (
          <span
            className={`ml-1 shrink-0 ${record.status_code >= 400 ? 'text-red-400' : 'text-green-400'}`}
          >
            {record.status_code}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div className="mt-1.5 space-y-1 pl-[264px]">
          {record.request_id && (
            <div className="text-gray-400">
              <span className="text-gray-500">request_id:</span> {record.request_id}
            </div>
          )}
          {record.exception && (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-red-50 p-2 text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {record.exception}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const LogsPage = () => {
  usePageTitle('Logs');
  const { authEnabled, user } = useAuth();

  const [records, setRecords] = useState<LogRecord[]>([]);
  const [level, setLevel] = useState<LogLevel>('ALL');
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [, setLastSeq] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const esRef = useRef<EventSource | null>(null);

  // Guard — page requires admin when auth is enabled
  const canAccess = !authEnabled || !!user;

  // ── Scroll to bottom when live ────────────────────────────────────────────

  useEffect(() => {
    if (autoScrollRef.current && live) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [records, live]);

  // ── Fetch historic logs ───────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ n: '500' });
      if (level !== 'ALL') params.set('level', level);
      if (search) params.set('search', search);
      const data = await fetch(`/api/logs?${params}`).then((r) => r.json());
      setRecords(data.records ?? []);
      setLastSeq(data.last_seq ?? 0);
    } catch {
      /* network error — keep existing records */
    } finally {
      setLoading(false);
    }
  }, [level, search]);

  // ── SSE live stream ───────────────────────────────────────────────────────

  const startStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }
    const params = new URLSearchParams();
    if (level !== 'ALL') params.set('level', level);
    if (search) params.set('search', search);
    const es = new EventSource(`/api/logs/stream?${params}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const record = JSON.parse(e.data) as LogRecord;
        if ('error' in record) return;
        setRecords((prev) => {
          const next = [...prev, record];
          // Keep max 2000 records in memory
          return next.length > 2000 ? next.slice(-2000) : next;
        });
        setLastSeq(record._seq);
      } catch {
        /* ignore parse errors */
      }
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
    };
  }, [level, search]);

  const stopStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  // ── Mount / live toggle ───────────────────────────────────────────────────

  useEffect(() => {
    if (!canAccess) return;
    if (live) {
      void fetchLogs().then(startStream);
    } else {
      stopStream();
      void fetchLogs();
    }
    return () => {
      stopStream();
    };
  }, [live, level, search, canAccess]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear logs ────────────────────────────────────────────────────────────

  const clearLogs = async () => {
    await fetch('/api/logs', { method: 'DELETE' });
    setRecords([]);
    setLastSeq(0);
  };

  // ── Download as JSON ──────────────────────────────────────────────────────

  const downloadLogs = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rackscope-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── UI ─────────────────────────────────────────────────────────────────────

  const LEVELS: LogLevel[] = ['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR'];

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-base)] p-6">
      <PageHeader
        title="Backend Logs"
        actions={
          <div className="flex items-center gap-2">
          {/* Live / Pause toggle */}
          <button
            onClick={() => setLive((l) => !l)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              live
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {live ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {live ? 'Live' : 'Paused'}
          </button>

          {/* Refresh (when paused) */}
          {!live && (
            <button
              onClick={() => void fetchLogs()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}

          {/* Download */}
          <button
            onClick={downloadLogs}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          {/* Clear */}
          <button
            onClick={() => void clearLogs()}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-100 hover:text-red-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <Eraser className="h-4 w-4" />
            Clear
          </button>
          </div>
        }
      />

      {/* Access denied */}
      {!canAccess && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">Authentication required to view logs.</p>
        </div>
      )}

      {canAccess && (
        <>
          {/* Filter bar */}
          <div className="mb-3 flex items-center gap-3">
            {/* Level filter */}
            <div className="flex gap-1">
              {LEVELS.map((l) => (
                 
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold uppercase transition ${
                    level === l
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by message or logger…"
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            {/* Record count */}
            <span className="shrink-0 font-mono text-xs text-gray-400">
              {records.length} lines
            </span>
          </div>

          {/* Log output */}
          <div
            className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            onScroll={(e) => {
              const el = e.currentTarget;
              autoScrollRef.current =
                el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
            }}
          >
            {records.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-mono text-sm text-gray-400">No log entries yet.</p>
              </div>
            ) : (
              <>
                {records.map((r) => (
                  <LogRow key={r._seq} record={r} />
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
