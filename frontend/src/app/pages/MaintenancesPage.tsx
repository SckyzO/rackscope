/**
 * MaintenancesPage — Silence / Maintenance mode management
 *
 * Route: /maintenances
 *
 * Built using the component system from /templates/default as reference.
 */

import { useState, useCallback, useEffect } from 'react';
import { Wrench, Plus, Square, Trash2, Calendar, Clock, EyeOff, Eye, Filter } from 'lucide-react';
import { usePageTitle } from '@app/contexts/PageTitleContext';

// Layout
import { PageHeader, PageBreadcrumb, SectionCard } from '@app/pages/templates/EmptyPage';
import { Modal, ModalHeader, ModalFooter } from '@app/components/layout/Modal';

// Actions
import { RefreshButton, useAutoRefresh } from '@app/components/RefreshButton';
import { PageActionButton } from '@app/components/PageActionButton';

// UI primitives
import { IconBox } from '@app/components/ui/IconBox';
import { SelectInput } from '@app/components/ui/SelectInput';
import { AlertBanner } from '@app/components/ui/AlertBanner';

// Forms
import { FilterPills } from '@app/components/forms/FilterPills';

// Feedback
import { LoadingState } from '@app/components/feedback/LoadingState';
import { EmptyState } from '@app/components/feedback/EmptyState';
import { ErrorState } from '@app/components/feedback/ErrorState';

import { api } from '@src/services/api';
import type { MaintenanceEntry, MaintenanceStatus, MaintenanceTargetType } from '@src/types';

// ── Input style (matches SearchInput pattern from the design system) ───────────

const inputCls =
  'focus:border-brand-500 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';

// ── Maintenance-specific status pill (ACTIVE / SCHEDULED / EXPIRED) ───────────
// These statuses are not health statuses — they don't map to StatusPill.

const MAINT_STATUS_CLS: Record<MaintenanceStatus, string> = {
  ACTIVE: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
  SCHEDULED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const MaintenanceStatusPill = ({ status }: { status: MaintenanceStatus }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${MAINT_STATUS_CLS[status]}`}
  >
    {status}
  </span>
);

// ── Effect pill (hide / badge) ─────────────────────────────────────────────────

const EffectPill = ({ effect }: { effect: 'hide' | 'badge' }) =>
  effect === 'hide' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">
      <EyeOff className="h-3 w-3" />
      hide
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
      <Eye className="h-3 w-3" />
      badge
    </span>
  );

// ── Date formatting ────────────────────────────────────────────────────────────

const fmt = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
};

// ── Create form ────────────────────────────────────────────────────────────────

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

  return (
    <Modal open onClose={onClose} maxWidth={480}>
      <ModalHeader title="New Maintenance" onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-6">
          {error && <AlertBanner variant="error">{error}</AlertBanner>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Target Type
              </label>
              <SelectInput
                value={form.target_type}
                onChange={(v) =>
                  setForm((f) => ({ ...f, target_type: v as MaintenanceTargetType }))
                }
                options={[
                  { label: 'Rack', value: 'rack' },
                  { label: 'Device', value: 'device' },
                  { label: 'Room', value: 'room' },
                  { label: 'Site', value: 'site' },
                ]}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Effect
              </label>
              <SelectInput
                value={form.effect}
                onChange={(v) => setForm((f) => ({ ...f, effect: v as 'hide' | 'badge' }))}
                options={[
                  { label: 'Badge — visible, tagged', value: 'badge' },
                  { label: 'Hide — suppressed', value: 'hide' },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Target ID
            </label>
            <input
              type="text"
              value={form.target_id}
              onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value }))}
              placeholder="e.g. rack-01, node-42"
              className={inputCls}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Reason</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Hardware replacement, firmware update…"
              className={inputCls}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Expires At{' '}
              <span className="font-normal text-gray-400 dark:text-gray-500">
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
        </div>

        <ModalFooter>
          <PageActionButton onClick={onClose}>Cancel</PageActionButton>
          <PageActionButton type="submit" variant="primary" icon={Plus} disabled={loading}>
            {loading ? 'Creating…' : 'Create'}
          </PageActionButton>
        </ModalFooter>
      </form>
    </Modal>
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
    <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-3.5 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5">
      <IconBox
        icon={Wrench}
        size="md"
        bg="bg-brand-50 dark:bg-brand-500/10"
        color="text-brand-500"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {entry.target_type}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {entry.target_id}
          </span>
          <MaintenanceStatusPill status={entry.status} />
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

      <div className="flex shrink-0 items-center gap-2">
        {entry.status === 'ACTIVE' && (
          <PageActionButton icon={Square} onClick={() => onStop(entry.id)} title="Stop maintenance">
            Stop
          </PageActionButton>
        )}
        <PageActionButton
          icon={Trash2}
          variant="danger-outline"
          onClick={() => onDelete(entry.id)}
          title="Delete"
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Expired', value: 'EXPIRED' },
];

export function MaintenancesPage() {
  usePageTitle('Maintenances');

  const [maintenances, setMaintenances] = useState<MaintenanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
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

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const { autoRefreshMs, onIntervalChange } = useAutoRefresh('maintenances', fetchData);

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

  const filtered =
    filter === 'all' ? maintenances : maintenances.filter((m) => m.status === filter);

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
            <RefreshButton
              onRefresh={fetchData}
              autoRefreshMs={autoRefreshMs}
              onIntervalChange={onIntervalChange}
            />
            <PageActionButton icon={Plus} variant="primary" onClick={() => setModalOpen(true)}>
              New Maintenance
            </PageActionButton>
          </>
        }
      />

      <SectionCard
        title="Maintenance Windows"
        icon={Wrench}
        iconColor="text-brand-500"
        iconBg="bg-brand-50 dark:bg-brand-500/10"
      >
        <div className="mb-4">
          <FilterPills options={FILTER_OPTIONS} value={filter} onChange={setFilter} icon={Filter} />
        </div>

        {loading ? (
          <LoadingState message="Loading maintenances…" />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No maintenances"
            description={
              filter === 'all'
                ? 'Create a maintenance window to silence or tag alerts during planned work.'
                : `No ${filter.toLowerCase()} maintenances.`
            }
            icon={Wrench}
            action={
              filter === 'all' ? (
                <PageActionButton icon={Plus} variant="primary" onClick={() => setModalOpen(true)}>
                  New Maintenance
                </PageActionButton>
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
