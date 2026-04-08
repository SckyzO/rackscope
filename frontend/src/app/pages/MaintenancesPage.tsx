/**
 * MaintenancesPage — Silence / Maintenance mode management
 *
 * Lists all maintenances (active, scheduled, expired) with filters.
 * Allows creating, stopping, and deleting maintenance entries.
 */

import { useState, useCallback } from 'react';
import {
  Wrench,
  Plus,
  Square,
  Trash2,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  X,
  AlertCircle,
} from 'lucide-react';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@app/pages/templates/EmptyPage';
import { PageActionButton } from '@app/components/PageActionButton';
import { RefreshButton, useAutoRefresh } from '@app/components/RefreshButton';
import { api } from '@src/services/api';
import type { MaintenanceEntry, MaintenanceStatus, MaintenanceTargetType } from '@src/types';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  ACTIVE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  SCHEDULED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const StatusPill = ({ status }: { status: MaintenanceStatus }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
  >
    {status}
  </span>
);

const EffectPill = ({ effect }: { effect: 'hide' | 'badge' }) =>
  effect === 'hide' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-300">
      <EyeOff className="h-3 w-3" />
      hide
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
      <Eye className="h-3 w-3" />
      badge
    </span>
  );

// ── Date formatting ───────────────────────────────────────────────────────────

const fmt = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

// ── Tab filter ────────────────────────────────────────────────────────────────

type TabFilter = 'all' | MaintenanceStatus;
const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'EXPIRED', label: 'Expired' },
];

// ── Create modal ──────────────────────────────────────────────────────────────

type CreateFormState = {
  target_type: MaintenanceTargetType;
  target_id: string;
  reason: string;
  effect: 'hide' | 'badge';
  expires_at: string;
};

const EMPTY_FORM: CreateFormState = {
  target_type: 'rack',
  target_id: '',
  reason: '',
  effect: 'badge',
  expires_at: '',
};

function CreateMaintenanceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.createMaintenance({
        target_type: form.target_type,
        target_id: form.target_id.trim(),
        reason: form.reason.trim(),
        effect: form.effect,
        expires_at: form.expires_at ? form.expires_at : null,
      });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create maintenance');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500';
  const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
              <Wrench className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              New Maintenance
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Target Type</label>
              <select
                value={form.target_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, target_type: e.target.value as MaintenanceTargetType }))
                }
                className={inputCls}
              >
                <option value="rack">Rack</option>
                <option value="device">Device</option>
                <option value="room">Room</option>
                <option value="site">Site</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Effect</label>
              <select
                value={form.effect}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effect: e.target.value as 'hide' | 'badge' }))
                }
                className={inputCls}
              >
                <option value="badge">Badge — alerts visible but tagged</option>
                <option value="hide">Hide — alerts suppressed</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Target ID</label>
            <input
              type="text"
              value={form.target_id}
              onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value }))}
              placeholder="e.g. rack-01, node-42"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Reason</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Hardware replacement, firmware update…"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>
              Expires At{' '}
              <span className="font-normal text-gray-400">
                (optional — leave blank for manual stop)
              </span>
            </label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Maintenance row ────────────────────────────────────────────────────────────

function MaintenanceRow({
  entry,
  onStop,
  onDelete,
}: {
  entry: MaintenanceEntry;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-gray-100 px-4 py-3.5 last:border-0 dark:border-gray-800">
      {/* Icon */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
        <Wrench className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {entry.target_type}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">{entry.target_id}</span>
          <StatusPill status={entry.status} />
          <EffectPill effect={entry.effect} />
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{entry.reason}</p>
        <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Created {fmt(entry.created_at)}
          </span>
          {entry.starts_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Starts {fmt(entry.starts_at)}
            </span>
          )}
          {entry.expires_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expires {fmt(entry.expires_at)}
            </span>
          )}
          {entry.ended_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ended {fmt(entry.ended_at)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {entry.status === 'ACTIVE' && (
          <button
            onClick={() => onStop(entry.id)}
            title="Stop maintenance"
            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </button>
        )}
        <button
          onClick={() => onDelete(entry.id)}
          title="Delete maintenance"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MaintenancesPage() {
  usePageTitle('Maintenances');

  const [maintenances, setMaintenances] = useState<MaintenanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getMaintenances();
      setMaintenances(data.maintenances);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenances');
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchData, 15);

  const handleStop = async (id: string) => {
    try {
      await api.stopMaintenance(id);
      await fetchData();
    } catch {
      // silently ignore — user can retry
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMaintenance(id);
      await fetchData();
    } catch {
      // silently ignore — user can retry
    }
  };

  const filtered = tab === 'all' ? maintenances : maintenances.filter((m) => m.status === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenances"
        description="Silence or tag infrastructure alerts during planned maintenance windows."
        breadcrumb={
          <PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Maintenances' }]} />
        }
        actions={
          <>
            <RefreshButton onRefresh={fetchData} />
            <PageActionButton
              icon={Plus}
              label="New Maintenance"
              onClick={() => setModalOpen(true)}
            />
          </>
        }
      />

      <SectionCard
        title="Maintenance Windows"
        icon={Wrench}
        iconColor="text-violet-600 dark:text-violet-400"
        iconBg="bg-violet-100 dark:bg-violet-900/30"
      >
        {/* Tabs */}
        <div className="-mt-1 mb-4 flex flex-wrap gap-1 border-b border-gray-100 pb-3 dark:border-gray-800">
          {TABS.map(({ key, label }) => {
            const count =
              key === 'all'
                ? maintenances.length
                : maintenances.filter((m) => m.status === key).length;
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading maintenances…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No maintenances"
            description={
              tab === 'all'
                ? 'Create a maintenance window to silence or tag alerts during planned work.'
                : `No ${tab.toLowerCase()} maintenances.`
            }
            action={
              tab === 'all' ? (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                >
                  <Plus className="h-4 w-4" />
                  New Maintenance
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="-mx-6 -mb-6">
            {filtered.map((entry) => (
              <MaintenanceRow
                key={entry.id}
                entry={entry}
                onStop={handleStop}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {modalOpen && (
        <CreateMaintenanceModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            void fetchData();
          }}
        />
      )}
    </div>
  );
}
