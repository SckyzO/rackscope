import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDownUp, Download, Eraser, Pause, Play, RefreshCw, Search } from 'lucide-react';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  EmptyState,
  LoadingState,
  HealthDot,
} from './templates/EmptyPage';
import { PageActionButton, PageActionIconButton } from '@app/components/PageActionButton';
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

const LEVEL_TEXT: Record<string, string> = {
  DEBUG: 'text-gray-500 dark:text-gray-500',
  INFO: 'text-blue-600 dark:text-blue-400',
  WARNING: 'text-amber-600 dark:text-amber-400',
  ERROR: 'text-red-600 dark:text-red-400',
  CRITICAL: 'text-red-700 dark:text-red-300 font-bold',
};

const LEVEL_BADGE: Record<string, string> = {
  DEBUG: 'bg-gray-800/60 text-gray-400',
  INFO: 'bg-blue-950/60 text-blue-400',
  WARNING: 'bg-amber-950/60 text-amber-400',
  ERROR: 'bg-red-950/60 text-red-400',
  CRITICAL: 'bg-red-900/80 text-red-200 font-bold',
};

// ── Log row ───────────────────────────────────────────────────────────────────

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
      className={`border-b border-[#1e2535] font-mono text-xs transition-colors ${
        expanded ? 'bg-[#141924]' : 'hover:bg-[#141924]/60'
      } ${hasDetail ? 'cursor-pointer' : ''}`}
      onClick={() => hasDetail && setExpanded((e) => !e)}
    >
      {/* Main row */}
      <div className="flex items-baseline gap-0 px-4 py-1.5">
        {/* Timestamp */}
        <span className="w-[92px] shrink-0 text-[#4a5568] select-none">{time}</span>

        {/* Level badge */}
        <span
          className={`mr-3 w-[58px] shrink-0 rounded px-1 py-px text-center text-[10px] font-semibold tracking-wide uppercase ${
            LEVEL_BADGE[lvl] ?? LEVEL_BADGE.INFO
          }`}
        >
          {lvl}
        </span>

        {/* Logger */}
        <span className="mr-3 w-44 shrink-0 truncate text-[#4a6580]">{record.logger}</span>

        {/* Message */}
        <span className={`flex-1 break-all ${LEVEL_TEXT[lvl] ?? 'text-[#c9d1d9]'}`}>
          {record.message}
        </span>

        {/* Right meta */}
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {record.duration_ms !== undefined && (
            <span className="text-[#4a5568]">{record.duration_ms.toFixed(1)}ms</span>
          )}
          {record.status_code !== undefined && (
            <span
              className={`font-semibold ${record.status_code >= 400 ? 'text-red-500' : 'text-emerald-500'}`}
            >
              {record.status_code}
            </span>
          )}
          {hasDetail && <span className="text-[10px] text-[#4a5568]">{expanded ? '▲' : '▼'}</span>}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div className="space-y-1.5 border-t border-[#1e2535] bg-[#0d1117] px-4 py-2">
          {record.request_id && (
            <div className="text-[#4a6580]">
              <span className="text-[#647889]">request_id</span>
              <span className="text-[#4a5568]"> = </span>
              <span className="text-[#79c0ff]">{record.request_id}</span>
            </div>
          )}
          {record.exception && (
            <pre className="overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap text-red-400">
              {record.exception}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

// ── Level pill toggle ─────────────────────────────────────────────────────────

const LEVEL_PILL_ACTIVE: Record<LogLevel, string> = {
  ALL: 'bg-[#1c2b3a] text-[#58a6ff] border-[#1f6feb]/50',
  DEBUG: 'bg-gray-800 text-gray-300 border-gray-600',
  INFO: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  WARNING: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
  ERROR: 'bg-red-900/50 text-red-300 border-red-700/50',
};

const LevelPill = ({
  label,
  active,
  onClick,
}: {
  label: LogLevel;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-xl border px-3 py-2 text-xs font-semibold tracking-wider uppercase transition-all ${
      active
        ? (LEVEL_PILL_ACTIVE[label] ?? 'bg-brand-500/20 text-brand-300 border-brand-500/40')
        : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600 dark:border-gray-700 dark:bg-transparent dark:text-gray-500 dark:hover:border-gray-600 dark:hover:text-gray-400'
    }`}
  >
    {label}
  </button>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const LogsPage = () => {
  usePageTitle('Logs');
  const { authEnabled, user } = useAuth();

  const [records, setRecords] = useState<LogRecord[]>([]);
  const [level, setLevel] = useState<LogLevel>('ALL');
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastSeq, setLastSeq] = useState(0);
  const [reversed, setReversed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const esRef = useRef<EventSource | null>(null);

  const canAccess = !authEnabled || !!user;

  // Auto-scroll: newest-last → scroll to bottom; newest-first → scroll to top
  useEffect(() => {
    if (!autoScrollRef.current || !live) return;
    const el = containerRef.current;
    if (!el) return;
    if (reversed) {
      el.scrollTop = 0;
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [records, live, reversed]);

  // Fetch snapshot
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

  // Start SSE stream
  const startStream = useCallback(() => {
    esRef.current?.close();
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
          return next.length > 2000 ? next.slice(-2000) : next;
        });
        setLastSeq(record._seq);
      } catch {
        /* ignore */
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

  // Mount / toggle live
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

  const clearLogs = async () => {
    await fetch('/api/logs', { method: 'DELETE' });
    setRecords([]);
    setLastSeq(0);
  };

  const downloadLogs = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rackscope-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const LEVELS: LogLevel[] = ['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR'];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Backend Logs"
        breadcrumb={<PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Logs' }]} />}
        actions={
          <>
            {/* Live / Pause */}
            <PageActionButton
              icon={live ? Pause : Play}
              variant={live ? 'brand-outline' : 'outline'}
              onClick={() => setLive((l) => !l)}
            >
              {live ? (
                <span className="flex items-center gap-1.5">
                  <HealthDot status="OK" pulse />
                  Live
                </span>
              ) : (
                'Paused'
              )}
            </PageActionButton>

            {/* Refresh (paused only) */}
            {!live && (
              <PageActionIconButton
                icon={RefreshCw}
                title="Refresh snapshot"
                onClick={() => void fetchLogs()}
                disabled={loading}
              />
            )}

            {/* Reverse order */}
            <PageActionIconButton
              icon={ArrowDownUp}
              title={reversed ? 'Newest last (chronological)' : 'Newest first (reverse)'}
              variant={reversed ? 'brand-outline' : 'outline'}
              onClick={() => setReversed((r) => !r)}
            />

            {/* Export */}
            <PageActionIconButton
              icon={Download}
              title="Export as JSON"
              onClick={downloadLogs}
              disabled={records.length === 0}
            />

            {/* Clear */}
            <PageActionButton
              icon={Eraser}
              variant="danger-outline"
              onClick={() => void clearLogs()}
            >
              Clear
            </PageActionButton>
          </>
        }
      />

      {/* ── Access denied ───────────────────────────────────────────────────── */}
      {!canAccess && (
        <SectionCard title="Access restricted">
          <EmptyState title="Authentication required" description="Sign in to view backend logs." />
        </SectionCard>
      )}

      {canAccess && (
        <>
          {/* ── Filters ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Level pills */}
            <div className="flex gap-1.5">
              {LEVELS.map((l) => (
                <LevelPill key={l} label={l} active={level === l} onClick={() => setLevel(l)} />
              ))}
            </div>

            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by message or logger…"
                className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-2 pr-3 pl-9 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
              />
            </div>

            {/* Entry count */}
            <span className="shrink-0 font-mono text-xs text-gray-400 tabular-nums">
              {records.length.toLocaleString()} entries
            </span>
          </div>

          {/* ── Log terminal ──────────────────────────────────────────────── */}
          <SectionCard title="Output" desc={`seq ${lastSeq} · ${live ? 'streaming' : 'snapshot'}`}>
            {/* Terminal viewport — fixed dark background regardless of app theme */}
            <div
              ref={containerRef}
              className="overflow-y-auto rounded-lg bg-[#0d1117] ring-1 ring-[#1e2535]"
              style={{ height: '65vh' }}
              onScroll={(e) => {
                const el = e.currentTarget;
                // When normal order: auto-scroll enabled when near bottom
                // When reversed:     auto-scroll enabled when near top
                if (reversed) {
                  autoScrollRef.current = el.scrollTop <= 24;
                } else {
                  autoScrollRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
                }
              }}
            >
              {loading && records.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <LoadingState message="Fetching logs…" />
                </div>
              ) : records.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    title="No log entries"
                    description="Logs appear here once the backend generates activity."
                  />
                </div>
              ) : (
                (reversed ? [...records].reverse() : records).map((r) => (
                  <LogRow key={r._seq} record={r} />
                ))
              )}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};
