import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Server,
  Save,
  X,
  CheckSquare,
  Layers,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Activity,
  BarChart2,
} from 'lucide-react';
import { api } from '../../../services/api';
import type {
  RackTemplate,
  InfrastructureComponent,
  CheckDefinition,
  RackComponentTemplate,
} from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  LoadingState,
  ErrorState,
  EmptyState,
} from '../templates/EmptyPage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RackDraft = {
  id: string;
  name: string;
  u_height: string;
  checks: string[];
};


const toDraft = (tpl: RackTemplate): RackDraft => ({
  id: tpl.id,
  name: tpl.name,
  u_height: String(tpl.u_height ?? 42),
  checks: tpl.checks ?? [],
});

const draftToTemplate = (draft: RackDraft, base?: RackTemplate): Record<string, unknown> => ({
  id: draft.id.trim(),
  name: draft.name.trim(),
  u_height: parseInt(draft.u_height) || 42,
  checks: draft.checks,
  infrastructure: base?.infrastructure ?? { components: [] },
});

// ---------------------------------------------------------------------------
// Component type styles
// ---------------------------------------------------------------------------

const COMP_TYPE_STYLES: Record<string, string> = {
  power:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  cooling:
    'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
  management:
    'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30',
  network:
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  other:
    'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

// ---------------------------------------------------------------------------
// RackPreview — visual rack representation using CSS theme variables
// ---------------------------------------------------------------------------

const RAIL_COLORS: Record<string, { bg: string; border: string; text: string; abbr: string }> = {
  power:      { bg: 'rgba(202,138,4,0.15)',   border: '#ca8a04', text: '#facc15', abbr: 'PWR' },
  cooling:    { bg: 'rgba(8,145,178,0.15)',   border: '#0891b2', text: '#38bdf8', abbr: 'CLG' },
  management: { bg: 'rgba(124,58,237,0.15)', border: '#7c3aed', text: '#a78bfa', abbr: 'MGT' },
  network:    { bg: 'rgba(5,150,105,0.15)',  border: '#059669', text: '#34d399', abbr: 'NET' },
  other:      { bg: 'rgba(75,85,99,0.15)',   border: '#4b5563', text: '#9ca3af', abbr: 'OTH' },
};

const RackPreview = ({
  template,
  view = 'front',
}: {
  template: RackTemplate;
  view?: 'front' | 'rear';
}) => {
  const uHeight = template.u_height ?? 42;
  const infra = template.infrastructure ?? {};

  // Front = components + front_components; Rear = rear_components
  const allInfraComponents: InfrastructureComponent[] = view === 'rear'
    ? [...(infra.rear_components ?? [])]
    : [...(infra.components ?? []), ...(infra.front_components ?? [])];

  const sideComponents: InfrastructureComponent[] = infra.side_components ?? [];

  // Build u-mount occupancy map (start U → component)
  const uMountMap = new Map<number, { comp: InfrastructureComponent; h: number }>();
  const occupiedU = new Set<number>();
  allInfraComponents.forEach((comp) => {
    if ((comp.location === 'u-mount' || !comp.location) && comp.u_position) {
      const h = comp.u_height ?? 1;
      uMountMap.set(comp.u_position, { comp, h });
      for (let u = comp.u_position; u < comp.u_position + h; u++) occupiedU.add(u);
    }
  });

  const leftRail = sideComponents.filter((c) => c.location === 'side-left');
  const rightRail = sideComponents.filter((c) => c.location === 'side-right');

  const slots = Array.from({ length: uHeight }, (_, i) => i + 1);

  return (
    <div className="flex h-full flex-col">
      {/* View label */}
      <div className="shrink-0 border-b border-[var(--color-border)]/20 px-5 py-2.5">
        <span className={`text-[11px] font-bold uppercase tracking-widest ${
          view === 'rear' ? 'text-amber-400/80' : 'text-brand-400/80'
        }`}>
          {view === 'rear' ? 'Rear' : 'Front'}
        </span>
      </div>

      {/* Rack */}
      <div className="flex flex-1 items-start justify-center gap-2 overflow-hidden py-5 px-4">
        {/* Left rail */}
        {leftRail.length > 0 && (
          <div className="flex h-full flex-col gap-0.5">
            {leftRail.map((comp, i) => {
              const col = RAIL_COLORS[comp.type] ?? RAIL_COLORS.other;
              return (
                <div
                  key={i}
                  title={comp.name}
                  className="flex items-center justify-center rounded-sm"
                  style={{
                    width: 22,
                    flex: comp.u_height ?? 2,
                    backgroundColor: col.bg,
                    border: `1px solid ${col.border}`,
                    writingMode: 'vertical-lr',
                    transform: 'rotate(180deg)',
                  }}
                >
                  <span className="font-mono text-[7px] font-black" style={{ color: col.text }}>
                    {col.abbr}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Rack body */}
        <div
          className="relative flex h-full flex-1 flex-col-reverse border-x-[20px] transition-colors duration-500"
          style={{
            borderColor: 'var(--color-rack-frame)',
            backgroundColor: 'var(--color-rack-frame)',
            maxWidth: 280,
          }}
        >
          {slots.map((u) => {
            const mount = uMountMap.get(u);
            const isOccupied = occupiedU.has(u) && !mount;

            if (isOccupied) return null; // part of multi-U block

            if (mount) {
              const col = RAIL_COLORS[mount.comp.type] ?? RAIL_COLORS.other;
              return (
                <div
                  key={u}
                  style={{ flex: mount.h, backgroundColor: col.bg, borderLeft: `3px solid ${col.border}` }}
                  className="relative flex items-center px-2.5 transition-all"
                >
                  <div className="pointer-events-none absolute -left-[18px] flex h-full w-[18px] items-center justify-center font-mono text-[8px] font-black text-[var(--color-text-base)] opacity-40 select-none">
                    {u}
                  </div>
                  <div className="pointer-events-none absolute -right-[18px] flex h-full w-[18px] items-center justify-center font-mono text-[8px] font-black text-[var(--color-text-base)] opacity-40 select-none">
                    {u}
                  </div>
                  <span className="truncate text-[10px] font-semibold" style={{ color: col.text }}>
                    {mount.comp.name}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={u}
                style={{ flex: 1 }}
                className="relative flex items-center border-b border-[var(--color-border)]/10 transition-colors"
              >
                <div className="pointer-events-none absolute -left-[18px] flex h-full w-[18px] items-center justify-center font-mono text-[8px] font-black text-[var(--color-text-base)] opacity-40 select-none">
                  {u}
                </div>
                <div className="pointer-events-none absolute -right-[18px] flex h-full w-[18px] items-center justify-center font-mono text-[8px] font-black text-[var(--color-text-base)] opacity-40 select-none">
                  {u}
                </div>
                <div className="h-full w-full bg-[var(--color-empty-slot)] opacity-30" />
              </div>
            );
          })}
        </div>

        {/* Right rail */}
        {rightRail.length > 0 && (
          <div className="flex h-full flex-col gap-0.5">
            {rightRail.map((comp, i) => {
              const col = RAIL_COLORS[comp.type] ?? RAIL_COLORS.other;
              return (
                <div
                  key={i}
                  title={comp.name}
                  className="flex items-center justify-center rounded-sm"
                  style={{
                    width: 22,
                    flex: comp.u_height ?? 2,
                    backgroundColor: col.bg,
                    border: `1px solid ${col.border}`,
                    writingMode: 'vertical-lr',
                  }}
                >
                  <span className="font-mono text-[7px] font-black" style={{ color: col.text }}>
                    {col.abbr}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ComponentChip
// ---------------------------------------------------------------------------

const ComponentChip = ({ component }: { component: InfrastructureComponent }) => {
  const typeStyle = COMP_TYPE_STYLES[component.type] ?? COMP_TYPE_STYLES.other;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
          {component.name}
        </p>
        <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{component.id}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${typeStyle}`}
        >
          {component.type}
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-500">
          {component.location}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TemplateItem
// ---------------------------------------------------------------------------

const TemplateItem = ({
  template,
  selected,
  onClick,
}: {
  template: RackTemplate;
  selected: boolean;
  onClick: () => void;
}) => {
  const checksCount = template.checks?.length ?? 0;
  const compCount =
    (template.infrastructure?.components?.length ?? 0) +
    (template.infrastructure?.rear_components?.length ?? 0) +
    (template.infrastructure?.side_components?.length ?? 0) +
    (template.infrastructure?.rack_components?.length ?? 0);

  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-xl border px-3 py-3 text-left transition-all ${
        selected
          ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/8 dark:bg-[var(--color-accent)]/10'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-gray-700 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            selected
              ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
              : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:group-hover:bg-gray-700'
          }`}
        >
          <Server className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
            {template.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400 dark:text-gray-600">
            {template.id}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {template.u_height}U
            </span>
            {checksCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                <CheckSquare className="h-2.5 w-2.5" />
                {checksCount}
              </span>
            )}
            {compCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700/40 dark:text-slate-400">
                <Layers className="h-2.5 w-2.5" />
                {compCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// NewTemplateForm
// ---------------------------------------------------------------------------

const NewTemplateForm = ({
  onCancel,
  onCreated,
  existingIds,
}: {
  onCancel: () => void;
  onCreated: (id: string) => void;
  existingIds: string[];
}) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [uHeight, setUHeight] = useState('42');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const effectiveId = id.trim() || autoId;

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Name is required.');
    if (!effectiveId) errs.push('ID is required.');
    const u = parseInt(uHeight);
    if (!u || u <= 0 || u > 52) errs.push('U height must be between 1 and 52.');
    if (existingIds.includes(effectiveId)) errs.push('ID already exists.');
    return errs;
  }, [name, effectiveId, uHeight, existingIds]);

  const handleCreate = async () => {
    if (validationErrors.length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const template = {
        id: effectiveId,
        name: name.trim(),
        u_height: parseInt(uHeight) || 42,
        checks: [],
        infrastructure: { components: [] },
      };
      await api.createTemplate({ kind: 'rack', template });
      onCreated(effectiveId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create template.');
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-[var(--color-accent)] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600 dark:focus:border-[var(--color-accent)]';
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="rounded-2xl border border-[var(--color-accent)]/30 bg-white p-5 shadow-sm dark:border-[var(--color-accent)]/20 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          New Rack Template
        </h3>
        <button
          onClick={onCancel}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Standard Air Cooled 42U"
            className={inputCls}
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>
            ID{' '}
            <span className="text-gray-400 dark:text-gray-600">(auto-generated if empty)</span>
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder={autoId || 'rack-template-id'}
            className={inputCls}
          />
          {!id && autoId && (
            <p className="mt-1 font-mono text-[10px] text-gray-400 dark:text-gray-600">
              Will use: {autoId}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>U Height *</label>
          <input
            type="number"
            min={1}
            max={52}
            value={uHeight}
            onChange={(e) => setUHeight(e.target.value)}
            className={inputCls}
          />
        </div>
        {validationErrors.length > 0 && (
          <div className="space-y-0.5">
            {validationErrors.map((msg, i) => (
              <p
                key={i}
                className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {msg}
              </p>
            ))}
          </div>
        )}
        {error && <p className="text-[11px] text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void handleCreate();
            }}
            disabled={validationErrors.length > 0 || saving}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// EditorPanel
// ---------------------------------------------------------------------------

const EditorPanel = ({
  template,
  allChecks,
  onSaved,
}: {
  template: RackTemplate;
  allChecks: CheckDefinition[];
  onSaved: () => void;
}) => {
  const [draft, setDraft] = useState<RackDraft>(() => toDraft(template));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkSearch, setCheckSearch] = useState('');

  useEffect(() => {
    setDraft(toDraft(template));
    setDirty(false);
    setSaveStatus('idle');
    setSaveError(null);
  }, [template]);

  const updateDraft = useCallback(<K extends keyof RackDraft>(key: K, value: RackDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setSaveStatus('idle');
  }, []);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!draft.id.trim()) errs.push('Template ID is required.');
    if (!draft.name.trim()) errs.push('Name is required.');
    const u = parseInt(draft.u_height);
    if (!u || u <= 0 || u > 52) errs.push('U height must be between 1 and 52.');
    return errs;
  }, [draft]);

  const handleSave = async () => {
    if (validationErrors.length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const templateData = draftToTemplate(draft, template);
      await api.updateTemplate({ kind: 'rack', template: templateData });
      setSaveStatus('saved');
      setDirty(false);
      onSaved();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(toDraft(template));
    setDirty(false);
    setSaveStatus('idle');
    setSaveError(null);
  };

  const toggleCheck = (checkId: string, checked: boolean) => {
    updateDraft(
      'checks',
      checked ? [...draft.checks, checkId] : draft.checks.filter((id) => id !== checkId)
    );
  };

  const removeCheck = (checkId: string) => {
    updateDraft(
      'checks',
      draft.checks.filter((id) => id !== checkId)
    );
  };

  const allComponents: InfrastructureComponent[] = [
    ...(template.infrastructure?.components ?? []),
    ...(template.infrastructure?.front_components ?? []),
    ...(template.infrastructure?.rear_components ?? []),
    ...(template.infrastructure?.side_components ?? []),
  ];

  const rackComponents = template.infrastructure?.rack_components ?? [];

  const rackChecks = allChecks.filter(
    (c) => c.scope === 'rack' || c.kind === 'pdu' || c.kind === 'cooling'
  );
  const filteredChecks = rackChecks.filter(
    (c) =>
      !checkSearch ||
      (c.name ?? '').toLowerCase().includes(checkSearch.toLowerCase()) ||
      c.id.toLowerCase().includes(checkSearch.toLowerCase())
  );

  const inputCls =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-[var(--color-accent)] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600 dark:focus:border-[var(--color-accent)]';
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Panel header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
            <Server className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
              {template.name}
            </p>
            <p className="truncate font-mono text-[10px] text-gray-400 dark:text-gray-600">
              {template.id}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dirty && (
            <button
              onClick={handleDiscard}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <X className="h-3.5 w-3.5" />
              Discard
            </button>
          )}
          <button
            onClick={() => {
              void handleSave();
            }}
            disabled={!dirty || validationErrors.length > 0 || saving}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              saveStatus === 'saved'
                ? 'bg-emerald-500 text-white'
                : dirty && validationErrors.length === 0
                  ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
            }`}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {saveStatus === 'error' && saveError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {saveError}
        </div>
      )}

      {/* Scrollable sections */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        {/* Identity */}
        <SectionCard title="Identity" desc="Core template properties.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => updateDraft('name', e.target.value)}
                  placeholder="Standard Air Cooled"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Template ID</label>
                <input
                  type="text"
                  value={draft.id}
                  disabled
                  className={`${inputCls} cursor-not-allowed opacity-60`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>U Height *</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={draft.u_height}
                  onChange={(e) => updateDraft('u_height', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex items-end pb-0.5">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-600">
                    Height
                  </p>
                  <p className="font-mono text-lg font-bold text-gray-800 dark:text-gray-100">
                    {parseInt(draft.u_height) || 42}
                    <span className="ml-1 text-sm font-normal text-gray-400">U</span>
                  </p>
                </div>
              </div>
            </div>
            {validationErrors.length > 0 && (
              <div className="space-y-1">
                {validationErrors.map((msg, i) => (
                  <p
                    key={i}
                    className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"
                  >
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {msg}
                  </p>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Infrastructure */}
        <SectionCard
          title="Infrastructure"
          desc="Components defined in the template (read-only — edit YAML directly)."
          icon={Layers}
        >
          {allComponents.length === 0 && rackComponents.length === 0 ? (
            <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-600">
              No infrastructure components defined.
            </div>
          ) : (
            <div className="space-y-4">
              {allComponents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                    Components ({allComponents.length})
                  </p>
                  <div className="grid gap-2">
                    {allComponents.map((comp) => (
                      <ComponentChip key={comp.id} component={comp} />
                    ))}
                  </div>
                </div>
              )}
              {rackComponents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                    Rack Components ({rackComponents.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rackComponents.map((ref, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-mono text-[11px] text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      >
                        <Tag className="h-3 w-3 shrink-0 opacity-50" />
                        {ref.template_id}
                        <span className="text-gray-300 dark:text-gray-700">·</span>
                        U{ref.u_position}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Checks */}
        <SectionCard
          title="Checks"
          desc="Health checks assigned to this rack template."
          icon={CheckSquare}
        >
          {draft.checks.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {draft.checks.map((checkId) => {
                const check = allChecks.find((c) => c.id === checkId);
                return (
                  <span
                    key={checkId}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-400"
                  >
                    {check?.name ?? checkId}
                    <button
                      onClick={() => removeCheck(checkId)}
                      className="ml-0.5 rounded p-0.5 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                      title="Remove check"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <input
              type="text"
              value={checkSearch}
              onChange={(e) => setCheckSearch(e.target.value)}
              placeholder="Filter checks…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs placeholder-gray-400 focus:border-[var(--color-accent)] focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:placeholder-gray-600 dark:focus:bg-gray-800"
            />
            {filteredChecks.length === 0 ? (
              <p className="py-2 text-center text-xs text-gray-400 dark:text-gray-600">
                {checkSearch ? 'No matching checks.' : 'No rack-scope checks available.'}
              </p>
            ) : (
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {filteredChecks.map((check) => {
                  const on = draft.checks.includes(check.id);
                  return (
                    <label
                      key={check.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => toggleCheck(check.id, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-300 accent-[var(--color-accent)] dark:border-gray-600"
                      />
                      <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                        {check.name ?? check.id}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] uppercase text-gray-400 dark:text-gray-600">
                        {check.scope}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RackComponentDetailPanel
// ---------------------------------------------------------------------------

const TYPE_BADGE_STYLES: Record<string, string> = {
  pdu:     'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30',
  cooling: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30',
  power:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  network: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  management: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30',
  other:   'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

const RackComponentDetailPanel = ({ component }: { component: RackComponentTemplate }) => {
  const typeStyle = TYPE_BADGE_STYLES[component.type] ?? TYPE_BADGE_STYLES.other;
  const col = RAIL_COLORS[component.type] ?? RAIL_COLORS.other;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}
          >
            <Layers className="h-4 w-4" style={{ color: col.text }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{component.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-gray-400 dark:text-gray-600">{component.id}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Properties */}
        <SectionCard title="Properties" desc="Component definition">
          <div className="space-y-2">
            {[
              { label: 'Type',     value: <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeStyle}`}>{component.type}</span> },
              { label: 'Location', value: <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">{component.location}</span> },
              { label: 'U Height', value: <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{component.u_height}<span className="ml-0.5 text-xs font-normal text-gray-400">U</span></span> },
              ...(component.model ? [{ label: 'Model', value: <span className="text-sm text-gray-700 dark:text-gray-300">{component.model}</span> }] : []),
              ...(component.role  ? [{ label: 'Role',  value: <span className="text-sm text-gray-700 dark:text-gray-300">{component.role}</span>  }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-lg px-3 py-2 odd:bg-gray-50 dark:odd:bg-gray-800/40">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-500">{label}</span>
                <div>{value}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Checks */}
        {(component.checks?.length ?? 0) > 0 && (
          <SectionCard title="Checks" icon={CheckSquare}>
            <div className="flex flex-wrap gap-1.5">
              {component.checks!.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-400">
                  <CheckSquare className="h-3 w-3 opacity-70" />{id}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Metrics */}
        {(component.metrics?.length ?? 0) > 0 && (
          <SectionCard title="Metrics" icon={BarChart2} desc="Prometheus metrics exposed by this component">
            <div className="flex flex-wrap gap-1.5">
              {component.metrics!.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-mono text-[11px] text-brand-600 dark:border-brand-700/30 dark:bg-brand-500/10 dark:text-brand-400">
                  <Activity className="h-3 w-3 opacity-70" />{m}
                </span>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export const CosmosRackTemplateEditorPage = () => {
  usePageTitle('Rack Templates');

  const [templates, setTemplates] = useState<RackTemplate[]>([]);
  const [rackComponents, setRackComponents] = useState<RackComponentTemplate[]>([]);
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Left panel tabs: 'racks' | 'components'
  const [leftTab, setLeftTab] = useState<'racks' | 'components'>('racks');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [componentSearch, setComponentSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  // Accordion open state for component groups
  const [openComponentGroups, setOpenComponentGroups] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [catalog, checksData] = await Promise.all([api.getCatalog(), api.getChecks()]);
      setTemplates(catalog?.rack_templates ?? []);
      const components = catalog?.rack_component_templates ?? [];
      setRackComponents(components);
      setChecks(checksData?.checks ?? []);
      // Open all component groups by default
      const types = new Set(components.map((c) => c.type));
      setOpenComponentGroups(types);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId]
  );

  const grouped = useMemo(() => {
    const filtered = templates.filter(
      (t) =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
    );
    const map = new Map<number, RackTemplate[]>();
    for (const tpl of filtered) {
      const h = tpl.u_height ?? 42;
      if (!map.has(h)) map.set(h, []);
      const bucket = map.get(h);
      if (bucket) bucket.push(tpl);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [templates, search]);

  const existingIds = useMemo(() => templates.map((t) => t.id), [templates]);
  const selectedComponent = useMemo(
    () => rackComponents.find((c) => c.id === selectedComponentId) ?? null,
    [rackComponents, selectedComponentId]
  );

  const handleCreated = async (newId: string) => {
    setShowNewForm(false);
    await loadData();
    setSelectedId(newId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-5">
      {/* Page header */}
      <PageHeader
        title="Rack Templates"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'Editors', href: '#' },
              { label: 'Rack Templates' },
            ]}
          />
        }
        actions={
          !loading && !loadError ? (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Template
            </button>
          ) : undefined
        }
      />

      {/* Body */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <LoadingState message="Loading rack templates…" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <ErrorState
            message={loadError}
            onRetry={() => {
              void loadData();
            }}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-5">

          {/* ── LEFT PANEL: Racks + Components tabs ────────────────────── */}
          <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-gray-100 dark:border-gray-800">
              {(['racks', 'components'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab)}
                  className={[
                    'flex-1 py-3 text-xs font-semibold capitalize transition-colors',
                    leftTab === tab
                      ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                  ].join(' ')}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Racks tab */}
            {leftTab === 'racks' && (
              <>
                {showNewForm && (
                  <div className="shrink-0 p-3">
                    <NewTemplateForm
                      onCancel={() => setShowNewForm(false)}
                      onCreated={(id) => { void handleCreated(id); }}
                      existingIds={existingIds}
                    />
                  </div>
                )}
                <div className="shrink-0 p-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search templates…"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-8 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3">
                  {grouped.length === 0 ? (
                    <EmptyState title={search ? 'No templates match.' : 'No rack templates yet.'} />
                  ) : (
                    <div className="space-y-4">
                      {grouped.map(([uHeight, items]) => (
                        <div key={uHeight}>
                          <p className="mb-2 px-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase dark:text-gray-600">{uHeight}U Racks</p>
                          <div className="space-y-1.5">
                            {items.map((tpl) => (
                              <TemplateItem key={tpl.id} template={tpl} selected={selectedId === tpl.id}
                                onClick={() => { setSelectedId(tpl.id); setSelectedComponentId(null); }} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Components tab — rack_component_templates (Flush accordion by type) */}
            {leftTab === 'components' && (() => {
              const filtered = rackComponents.filter(
                (c) => !componentSearch || c.name.toLowerCase().includes(componentSearch.toLowerCase()) || c.id.toLowerCase().includes(componentSearch.toLowerCase())
              );
              const byType = new Map<string, RackComponentTemplate[]>();
              filtered.forEach((c) => {
                const g = byType.get(c.type) ?? [];
                g.push(c);
                byType.set(c.type, g);
              });
              return (
                <>
                  <div className="shrink-0 p-3">
                    <input
                      type="text"
                      value={componentSearch}
                      onChange={(e) => setComponentSearch(e.target.value)}
                      placeholder="Search components…"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {byType.size === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-gray-400">No rack components</p>
                    ) : (
                      <div className="divide-y divide-gray-100 px-4 dark:divide-gray-800">
                        {Array.from(byType.entries()).map(([type, comps]) => {
                          const isOpen = openComponentGroups.has(type);
                          const style = COMP_TYPE_STYLES[type] ?? COMP_TYPE_STYLES.other;
                          return (
                            <div key={type}>
                              <button
                                onClick={() => setOpenComponentGroups((prev) => {
                                  const next = new Set(prev);
                                  if (isOpen) { next.delete(type); } else { next.add(type); }
                                  return next;
                                })}
                                className="flex w-full items-center justify-between py-3 text-left transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${style}`}>{type}</span>
                                  <span className="text-[10px] text-gray-400">{comps.length}</span>
                                </div>
                                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {isOpen && (
                                <div className="space-y-1 pb-2">
                                  {comps.map((comp) => (
                                    <button
                                      key={comp.id}
                                      onClick={() => { setSelectedComponentId(comp.id); setSelectedId(null); }}
                                      className={[
                                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all',
                                        selectedComponentId === comp.id
                                          ? 'bg-brand-50 dark:bg-brand-500/10'
                                          : 'hover:bg-gray-50 dark:hover:bg-white/5',
                                      ].join(' ')}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-semibold ${selectedComponentId === comp.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>{comp.name}</p>
                                        <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{comp.id} · {comp.u_height}U · {comp.location}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 dark:text-gray-600">{rackComponents.length} component{rackComponents.length !== 1 ? 's' : ''}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── FORM PANEL ─────────────────────────────────────────────── */}
          <div className="flex w-[560px] shrink-0 min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {selectedTemplate ? (
              <div className="flex-1 overflow-y-auto p-6">
                <EditorPanel key={selectedTemplate.id} template={selectedTemplate} allChecks={checks} onSaved={() => { void loadData(); }} />
              </div>
            ) : selectedComponent ? (
              <RackComponentDetailPanel component={selectedComponent} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                    <Server className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Select a template or component</p>
                </div>
              </div>
            )}
          </div>

          {/* ── DUAL RACK VIEWS (front + rear) ─────────────────────────── */}
          <div className="flex min-h-0 flex-1 gap-2 overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-rack-interior)] transition-colors duration-500">
            {selectedTemplate ? (
              <>
                {/* Front view */}
                <div className="flex min-h-0 flex-1 flex-col border-r border-[var(--color-border)]/20">
                  <RackPreview template={selectedTemplate} view="front" />
                </div>
                {/* Rear view */}
                <div className="flex min-h-0 flex-1 flex-col">
                  <RackPreview template={selectedTemplate} view="rear" />
                </div>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-border)]/20">
                  <Server className="h-6 w-6 text-[var(--color-text-base)] opacity-30" />
                </div>
                <p className="text-sm text-[var(--color-text-base)] opacity-40">Select a rack template to preview</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
