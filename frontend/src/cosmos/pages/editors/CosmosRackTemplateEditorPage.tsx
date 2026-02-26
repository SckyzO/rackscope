import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  BarChart2,
  FileCode2,
  Cpu,
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import jsYaml from 'js-yaml';
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

type RackCompRefDraft = {
  template_id: string;
  u_position: string;
  u_height: string;   // '' = use template default
  side: string;       // '' = use template default
};

type RackDraft = {
  id: string;
  name: string;
  u_height: string;
  checks: string[];
  rackCompRefs: RackCompRefDraft[];
};

const toDraft = (tpl: RackTemplate): RackDraft => ({
  id: tpl.id,
  name: tpl.name,
  u_height: String(tpl.u_height ?? 42),
  checks: tpl.checks ?? [],
  rackCompRefs: (tpl.infrastructure?.rack_components ?? []).map((r) => ({
    template_id: r.template_id,
    u_position: String(r.u_position ?? ''),
    u_height: r.u_height != null ? String(r.u_height) : '',
    side: r.side ?? '',
  })),
});

const draftToTemplate = (draft: RackDraft, base?: RackTemplate): Record<string, unknown> => ({
  id: draft.id.trim(),
  name: draft.name.trim(),
  u_height: parseInt(draft.u_height) || 42,
  checks: draft.checks,
  infrastructure: {
    ...(base?.infrastructure ?? {}),
    rack_components: draft.rackCompRefs.map((r) => ({
      template_id: r.template_id,
      u_position: parseInt(r.u_position) || 1,
      ...(r.u_height ? { u_height: parseInt(r.u_height) } : {}),
      ...(r.side ? { side: r.side } : {}),
    })),
  },
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

// ── UPositionStepper — replaces ugly native number spinners ─────────────────

const UPositionStepper = ({
  value,
  onChange,
  min = 1,
  max = 52,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
}) => {
  const num = parseInt(value) || min;
  const dec = () => num > min && onChange(String(num - 1));
  const inc = () => num < max && onChange(String(num + 1));

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') { onChange(''); return; }
    const n = parseInt(raw);
    if (!isNaN(n)) onChange(String(Math.min(max, Math.max(min, n))));
  };

  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 focus-within:border-brand-500 dark:border-gray-700">
      <button
        type="button"
        onClick={dec}
        disabled={num <= min}
        className="flex h-7 w-6 shrink-0 items-center justify-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <span className="text-sm leading-none">−</span>
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleInput}
        onBlur={() => { if (!value || isNaN(parseInt(value))) onChange(String(min)); }}
        className="w-8 bg-transparent text-center font-mono text-xs font-semibold text-gray-700 focus:outline-none dark:text-gray-200"
      />
      <button
        type="button"
        onClick={inc}
        disabled={num >= max}
        className="flex h-7 w-6 shrink-0 items-center justify-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <span className="text-sm leading-none">+</span>
      </button>
    </div>
  );
};

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
  rackComponentCatalog = [],
}: {
  template: RackTemplate;
  view?: 'front' | 'rear';
  rackComponentCatalog?: RackComponentTemplate[];
}) => {
  const uHeight = template.u_height ?? 42;
  const infra = template.infrastructure ?? {};

  // Front = components + front_components; Rear = rear_components
  const allInfraComponents: InfrastructureComponent[] = view === 'rear'
    ? [...(infra.rear_components ?? [])]
    : [...(infra.components ?? []), ...(infra.front_components ?? [])];

  // Resolve rack_component refs from the catalog
  const resolvedRackComponents = (infra.rack_components ?? []).flatMap((ref) => {
    const tpl = rackComponentCatalog.find((c) => c.id === ref.template_id);
    if (!tpl) return [];
    return [{ ref, tpl }];
  });

  // Add rack_components to body (u-mount, front, rear) or rails (side)
  // Filter by view: front/u-mount go in front, rear in rear
  const rackCompBodyItems = resolvedRackComponents.filter(({ tpl }) =>
    view === 'rear' ? tpl.location === 'rear' : tpl.location !== 'rear' && tpl.location !== 'side'
  );

  const sideComponents: InfrastructureComponent[] = infra.side_components ?? [];
  // Rack components with location='side' go on the rails
  const rackCompLeft = resolvedRackComponents.filter(({ ref, tpl }) =>
    tpl.location === 'side' && (ref.side === 'left' || (!ref.side && tpl.side === 'left'))
  );
  const rackCompRight = resolvedRackComponents.filter(({ ref, tpl }) =>
    tpl.location === 'side' && (ref.side === 'right' || (!ref.side && tpl.side === 'right') || (!ref.side && !tpl.side))
  );

  // Build u-mount occupancy map (start U → component)
  type UMount = { name: string; type: string; h: number };
  const uMountMap = new Map<number, UMount>();
  const occupiedU = new Set<number>();

  allInfraComponents.forEach((comp) => {
    if ((comp.location === 'u-mount' || !comp.location) && comp.u_position) {
      const h = comp.u_height ?? 1;
      uMountMap.set(comp.u_position, { name: comp.name, type: comp.type, h });
      for (let u = comp.u_position; u < comp.u_position + h; u++) occupiedU.add(u);
    }
  });

  // Add rack_component body items
  rackCompBodyItems.forEach(({ ref, tpl }) => {
    if (ref.u_position) {
      const h = ref.u_height ?? tpl.u_height ?? 1;
      uMountMap.set(ref.u_position, { name: tpl.name, type: tpl.type, h });
      for (let u = ref.u_position; u < ref.u_position + h; u++) occupiedU.add(u);
    }
  });

  const leftRail = [
    ...sideComponents.filter((c) => c.location === 'side-left').map((c) => ({ name: c.name, type: c.type, h: c.u_height ?? 2 })),
    ...rackCompLeft.map(({ tpl, ref }) => ({ name: tpl.name, type: tpl.type, h: ref.u_height ?? tpl.u_height ?? 2 })),
  ];
  const rightRail = [
    ...sideComponents.filter((c) => c.location === 'side-right').map((c) => ({ name: c.name, type: c.type, h: c.u_height ?? 2 })),
    ...rackCompRight.map(({ tpl, ref }) => ({ name: tpl.name, type: tpl.type, h: ref.u_height ?? tpl.u_height ?? 2 })),
  ];

  const slots = Array.from({ length: uHeight }, (_, i) => i + 1);

  return (
    <div className="flex h-full flex-col">
      {/* View label — centered */}
      <div className="shrink-0 flex items-center justify-center border-b border-[var(--color-border)]/20 py-2.5">
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
            {leftRail.map((item, i) => {
              const col = RAIL_COLORS[item.type] ?? RAIL_COLORS.other;
              return (
                <div
                  key={i}
                  title={item.name}
                  className="flex items-center justify-center rounded-sm"
                  style={{
                    width: 22,
                    flex: item.h,
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
              const col = RAIL_COLORS[mount.type] ?? RAIL_COLORS.other;
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
                    {mount.name}
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
            {rightRail.map((item, i) => {
              const col = RAIL_COLORS[item.type] ?? RAIL_COLORS.other;
              return (
                <div
                  key={i}
                  title={item.name}
                  className="flex items-center justify-center rounded-sm"
                  style={{
                    width: 22,
                    flex: item.h,
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
  rackComponentCatalog,
  onSaved,
  onDraftChange,
}: {
  template: RackTemplate;
  allChecks: CheckDefinition[];
  rackComponentCatalog: RackComponentTemplate[];
  onSaved: () => void;
  onDraftChange?: (draft: RackDraft) => void;
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
    setDraft((d) => {
      const next = { ...d, [key]: value };
      onDraftChange?.(next);
      return next;
    });
    setDirty(true);
    setSaveStatus('idle');
  }, [onDraftChange]); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Rack Components */}
        <SectionCard title="Rack Components" icon={Layers} desc="Components mounted in this rack (PDUs, switches, cooling…)">
          {draft.rackCompRefs.length > 0 && (
            <div className="mb-4 space-y-2">
              {draft.rackCompRefs.map((ref, idx) => {
                const tpl = rackComponentCatalog.find((c) => c.id === ref.template_id);
                const col = RAIL_COLORS[tpl?.type ?? 'other'] ?? RAIL_COLORS.other;
                return (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: col.border }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">{tpl?.name ?? ref.template_id}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-gray-400">U</span>
                      <UPositionStepper
                        value={ref.u_position}
                        onChange={(v) => { const next = [...draft.rackCompRefs]; next[idx] = { ...next[idx], u_position: v }; updateDraft('rackCompRefs', next); }}
                      />
                    </div>
                    {(tpl?.location === 'side' || ref.side) && (
                      <select
                        value={ref.side}
                        onChange={(e) => { const next = [...draft.rackCompRefs]; next[idx] = { ...next[idx], side: e.target.value }; updateDraft('rackCompRefs', next); }}
                        className="focus:border-brand-500 w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      >
                        <option value="">default</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    )}
                    <button
                      onClick={() => updateDraft('rackCompRefs', draft.rackCompRefs.filter((_, i) => i !== idx))}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                      title="Remove"
                    ><X className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>
          )}
          <AddRackCompRefForm rackComponentCatalog={rackComponentCatalog} onAdd={(ref) => updateDraft('rackCompRefs', [...draft.rackCompRefs, ref])} />
        </SectionCard>
      </div>
    </div>
  );
};

// ── AddRackCompRefForm ────────────────────────────────────────────────────────

const AddRackCompRefForm = ({
  rackComponentCatalog,
  onAdd,
}: {
  rackComponentCatalog: RackComponentTemplate[];
  onAdd: (ref: RackCompRefDraft) => void;
}) => {
  const [templateId, setTemplateId] = useState('');
  const [uPosition, setUPosition] = useState('');
  const [side, setSide] = useState('');
  const selectedTpl = rackComponentCatalog.find((c) => c.id === templateId);
  const isSide = selectedTpl?.location === 'side';
  const handleAdd = () => {
    if (!templateId || !uPosition) return;
    onAdd({ template_id: templateId, u_position: uPosition, u_height: '', side: isSide ? side : '' });
    setTemplateId(''); setUPosition(''); setSide('');
  };
  const inputCls = 'focus:border-brand-500 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
      <div className="flex-1" style={{ minWidth: 160 }}>
        <label className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Component</label>
        <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setSide(''); }} className={`w-full ${inputCls}`}>
          <option value="">— Select —</option>
          {rackComponentCatalog.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type}, {c.u_height}U)</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">U Position</label>
        <UPositionStepper value={uPosition || '1'} onChange={setUPosition} />
      </div>
      {isSide && (
        <div style={{ width: 80 }}>
          <label className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Side</label>
          <select value={side} onChange={(e) => setSide(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">default</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      )}
      <button onClick={handleAdd} disabled={!templateId || !uPosition} className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RackComponentDetailPanel
// ---------------------------------------------------------------------------


type CompDraft = {
  name: string;
  type: string;
  location: string;
  side: string;
  u_height: string;
  u_position: string;
  model: string;
  role: string;
  checks: string[];
  metrics: string[];
};

const toDraftComp = (c: RackComponentTemplate): CompDraft => ({
  name: c.name,
  type: c.type,
  location: c.location,
  side: c.side ?? 'left',
  u_height: String(c.u_height),
  u_position: c.u_position != null ? String(c.u_position) : '',
  model: c.model ?? '',
  role: c.role ?? '',
  checks: c.checks ?? [],
  metrics: c.metrics ?? [],
});

const RackComponentDetailPanel = ({
  component,
  onSaved,
}: {
  component: RackComponentTemplate;
  onSaved: () => void;
}) => {
  const [draft, setDraft] = useState<CompDraft>(() => toDraftComp(component));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newCheck, setNewCheck] = useState('');
  const [newMetric, setNewMetric] = useState('');

  useEffect(() => {
    setDraft(toDraftComp(component));
    setDirty(false);
    setSaveStatus('idle');
    setSaveError(null);
  }, [component]);

  const update = <K extends keyof CompDraft>(key: K, value: CompDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      await api.updateTemplate({
        kind: 'rack_component',
        template: {
          id: component.id,
          name: draft.name.trim(),
          type: draft.type,
          location: draft.location,
          ...(draft.location === 'side' ? { side: draft.side } : {}),
          u_height: parseInt(draft.u_height) || component.u_height,
          ...(draft.u_position ? { u_position: parseInt(draft.u_position) } : {}),
          ...(draft.model.trim() ? { model: draft.model.trim() } : {}),
          ...(draft.role.trim() ? { role: draft.role.trim() } : {}),
          checks: draft.checks,
          metrics: draft.metrics,
        },
      });
      setDirty(false);
      setSaveStatus('saved');
      onSaved();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
      setSaveStatus('error');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600';
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5';
  const col = RAIL_COLORS[draft.type] ?? RAIL_COLORS.other;

  return (
    <div className="flex h-full flex-col">
      {/* Header with save actions */}
      <div className="shrink-0 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}>
            <Layers className="h-4 w-4" style={{ color: col.text }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{component.name}</p>
            <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{component.id}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dirty && <button onClick={() => { setDraft(toDraftComp(component)); setDirty(false); }} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"><X className="h-3 w-3"/>Discard</button>}
            <button
              onClick={() => void handleSave()}
              disabled={!dirty || saving}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${saveStatus === 'saved' ? 'bg-green-500 text-white' : dirty ? 'bg-brand-500 text-white hover:bg-brand-600' : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'}`}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : saveStatus === 'saved' ? <CheckCircle2 className="h-3.5 w-3.5"/> : <Save className="h-3.5 w-3.5"/>}
              {saving ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
        {saveError && <p className="mt-2 text-xs text-red-500">{saveError}</p>}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Identity */}
        <SectionCard title="Identity" desc="Component properties">
          <div className="space-y-4">
            <div><label className={labelCls}>Name *</label><input value={draft.name} onChange={(e) => update('name', e.target.value)} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Type</label>
                <select value={draft.type} onChange={(e) => update('type', e.target.value)} className={inputCls}>
                  {['pdu','cooling','power','network','management','other'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <select value={draft.location} onChange={(e) => update('location', e.target.value)} className={inputCls}>
                  {['side','u-mount','front','rear'].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>U Height</label><input type="number" min={1} max={52} value={draft.u_height} onChange={(e) => update('u_height', e.target.value)} className={inputCls}/></div>
              <div><label className={labelCls}>Model</label><input value={draft.model} onChange={(e) => update('model', e.target.value)} placeholder="optional" className={inputCls}/></div>
            </div>
          </div>
        </SectionCard>

        {/* Checks */}
        <SectionCard title="Checks" icon={CheckSquare}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {draft.checks.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-400">
                {id}
                <button onClick={() => { update('checks', draft.checks.filter((c) => c !== id)); }} className="rounded p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"><X className="h-3 w-3"/></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newCheck.trim()) { update('checks', [...draft.checks, newCheck.trim()]); setNewCheck(''); }}} placeholder="check_id (Enter to add)" className={`${inputCls} text-xs`}/>
          </div>
        </SectionCard>

        {/* Metrics */}
        <SectionCard title="Metrics" icon={BarChart2} desc="Prometheus metrics collected for this component">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {draft.metrics.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-mono text-[11px] text-brand-600 dark:border-brand-700/30 dark:bg-brand-500/10 dark:text-brand-400">
                {m}
                <button onClick={() => { update('metrics', draft.metrics.filter((x) => x !== m)); }} className="rounded p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/20"><X className="h-3 w-3"/></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newMetric} onChange={(e) => setNewMetric(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newMetric.trim()) { update('metrics', [...draft.metrics, newMetric.trim()]); setNewMetric(''); }}} placeholder="metric_name (Enter to add)" className={`${inputCls} font-mono text-xs`}/>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// YamlDrawer — Monaco read/write with js-yaml validation (same as DC editor)
// ---------------------------------------------------------------------------

type YamlDrawerProps = {
  open: boolean;
  title: string;
  initialYaml: string;
  onSave: (yaml: string) => Promise<void>;
  onClose: () => void;
};

const YamlDrawer = ({ open, title, initialYaml, onSave, onClose }: YamlDrawerProps) => {
  const [value, setValue] = useState(initialYaml);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialYaml);
    setSaved(false);
    setParseError(null);
    setSaveError(null);
  }, [initialYaml, open]);

  const handleChange = (val: string | undefined) => {
    const v = val ?? '';
    setValue(v);
    try { jsYaml.load(v); setParseError(null); }
    catch (e) { setParseError(e instanceof Error ? e.message : 'Invalid YAML'); }
  };

  const handleSave = async () => {
    if (parseError) return;
    setSaving(true); setSaveError(null);
    try {
      await onSave(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 right-0 z-50 flex h-full w-[680px] flex-col border-l border-gray-800 bg-gray-950 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-white">{title}</span>
            {parseError && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                Invalid YAML
              </span>
            )}
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white/10 hover:text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Monaco */}
        <div className="min-h-0 flex-1">
          <MonacoEditor height="100%" defaultLanguage="yaml" theme="vs-dark" value={value} onChange={handleChange}
            options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, padding: { top: 12, bottom: 12 } }}
          />
        </div>
        {/* Validation error */}
        {parseError && (
          <div className="shrink-0 border-t border-red-500/20 bg-red-500/5 px-5 py-2.5">
            <p className="font-mono text-xs text-red-400">{parseError}</p>
          </div>
        )}
        {/* Footer */}
        <div className="shrink-0 border-t border-gray-800 px-5 py-4">
          {saveError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{saveError}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-600">
              {parseError ? '⚠ Fix YAML errors before saving' : '✓ Valid YAML'}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-white/5">
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || !!parseError}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                {saved ? 'Saved' : 'Save YAML'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// NewTemplateChoiceModal — choose Rack Template or Rack Component
// ---------------------------------------------------------------------------

const NewTemplateChoiceModal = ({
  onChoose,
  onClose,
}: {
  onChoose: (kind: 'rack' | 'rack-component') => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <X className="h-5 w-5" />
      </button>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Template</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">What type of template do you want to create?</p>
      <div className="mt-5 space-y-3">
        <button
          onClick={() => onChoose('rack')}
          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600/50 dark:hover:bg-brand-500/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15">
            <Server className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Rack Template</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Define a rack model (u_height, infrastructure, checks)</p>
          </div>
        </button>
        <button
          onClick={() => onChoose('rack-component')}
          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-amber-300 hover:bg-amber-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-600/50 dark:hover:bg-amber-500/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15">
            <Cpu className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Rack Component</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Define a PDU, cooling unit, switch or other component</p>
          </div>
        </button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// NewRackComponentForm
// ---------------------------------------------------------------------------

const COMPONENT_TYPES = ['pdu', 'cooling', 'power', 'network', 'management', 'other'] as const;
const COMPONENT_LOCATIONS = ['side', 'u-mount', 'front', 'rear'] as const;

const NewRackComponentForm = ({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: string) => void;
}) => {
  const [form, setForm] = useState({ name: '', id: '', type: 'pdu', location: 'side', uHeight: '2', model: '', uPosition: '', side: 'left' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoId = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const effectiveId = form.id.trim() || autoId;

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(null);
    try {
      await api.createTemplate({
        kind: 'rack',
        template: {
          id: effectiveId,
          name: form.name.trim(),
          type: form.type,
          location: form.location,
          u_height: parseInt(form.uHeight) || 2,
          ...(form.model.trim() ? { model: form.model.trim() } : {}),
          ...(form.uPosition ? { u_position: parseInt(form.uPosition) } : {}),
          ...(form.location === 'side' ? { side: form.side } : {}),
          checks: [],
          metrics: [],
        },
      });
      onCreated(effectiveId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-white p-5 shadow-sm dark:border-brand-500/20 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">New Rack Component</h3>
        <button onClick={onCancel} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-3">
        <div><label className={labelCls}>Name *</label><input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="PDU Raritan 16U" className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputCls}>
              {COMPONENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <select value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className={inputCls}>
              {COMPONENT_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>U Height</label><input type="number" min={1} max={52} value={form.uHeight} onChange={(e) => setForm((f) => ({ ...f, uHeight: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>Model</label><input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="optional" className={inputCls} /></div>
        </div>
        {/* Position in rack */}
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>U Position <span className="text-gray-400">(optional)</span></label><input type="number" min={1} max={52} value={form.uPosition} onChange={(e) => setForm((f) => ({ ...f, uPosition: e.target.value }))} placeholder="e.g. 1" className={inputCls} /></div>
          {form.location === 'side' && (
            <div>
              <label className={labelCls}>Rail side</label>
              <select value={form.side} onChange={(e) => setForm((f) => ({ ...f, side: e.target.value }))} className={inputCls}>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button onClick={onCancel} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 dark:border-gray-700">Cancel</button>
          <button onClick={() => void handleCreate()} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
          </button>
        </div>
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
  // New template flow: choice modal → rack form or component form
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showNewCompForm, setShowNewCompForm] = useState(false);
  // Accordion open state for component groups
  const [openComponentGroups, setOpenComponentGroups] = useState<Set<string>>(new Set());
  // YAML drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerYaml, setDrawerYaml] = useState('');
  const drawerOnSaveRef = useRef<(yaml: string) => Promise<void>>(() => Promise.resolve());

  const openYamlDrawer = (title: string, entity: unknown, onSave: (yaml: string) => Promise<void>) => {
    setDrawerTitle(title);
    setDrawerYaml(jsYaml.dump(entity, { lineWidth: 120 }));
    drawerOnSaveRef.current = onSave;
    setDrawerOpen(true);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [catalog, checksData] = await Promise.all([api.getCatalog(), api.getChecks()]);
      setTemplates(catalog?.rack_templates ?? []);
      const components = catalog?.rack_component_templates ?? [];
      setRackComponents(components);
      setChecks(checksData?.checks ?? []);
      // Collapsed by default — user opens manually
      setOpenComponentGroups(new Set());
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

  // Live preview — tracks draft edits from EditorPanel without saving
  const [previewDraft, setPreviewDraft] = useState<RackDraft | null>(null);

  // Reset preview when template selection changes
  useEffect(() => { setPreviewDraft(null); }, [selectedId]);

  // Build the preview template from draft + saved template (for RackPreview)
  const previewTemplate = useMemo((): RackTemplate | null => {
    if (!selectedTemplate) return null;
    if (!previewDraft) return selectedTemplate;
    return {
      ...selectedTemplate,
      name: previewDraft.name || selectedTemplate.name,
      u_height: parseInt(previewDraft.u_height) || selectedTemplate.u_height,
      checks: previewDraft.checks,
      infrastructure: {
        ...selectedTemplate.infrastructure,
        rack_components: previewDraft.rackCompRefs.map((r) => ({
          template_id: r.template_id,
          u_position: parseInt(r.u_position) || 1,
          ...(r.u_height ? { u_height: parseInt(r.u_height) } : {}),
          ...(r.side ? { side: r.side as 'left' | 'right' } : {}),
        })),
      },
    };
  }, [selectedTemplate, previewDraft]);

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
              onClick={() => setShowChoiceModal(true)}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
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
                {(showNewForm || showNewCompForm) && (
                  <div className="shrink-0 p-3">
                    {showNewForm && <NewTemplateForm
                      onCancel={() => setShowNewForm(false)}
                      onCreated={(id) => { void handleCreated(id); }}
                      existingIds={existingIds}
                    />}
                    {showNewCompForm && <NewRackComponentForm
                      onCancel={() => setShowNewCompForm(false)}
                      onCreated={(id) => { setShowNewCompForm(false); void loadData().then(() => { setLeftTab('components'); setSelectedComponentId(id); setSelectedId(null); }); }}
                    />}
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
                      <div className="space-y-1 p-2">
                        {Array.from(byType.entries()).map(([type, comps]) => {
                          const isOpen = openComponentGroups.has(type);
                          const col = RAIL_COLORS[type] ?? RAIL_COLORS.other;
                          return (
                            <div key={type} className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                              {/* Accordion header */}
                              <button
                                onClick={() => setOpenComponentGroups((prev) => {
                                  const next = new Set(prev);
                                  if (isOpen) { next.delete(type); } else { next.add(type); }
                                  return next;
                                })}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                              >
                                {/* Color dot */}
                                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: col.border }} />
                                <span className="flex-1 text-xs font-semibold capitalize text-gray-700 dark:text-gray-300">{type}</span>
                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">{comps.length}</span>
                                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {/* Accordion body */}
                              {isOpen && (
                                <div className="border-t border-gray-100 dark:border-gray-800">
                                  {comps.map((comp) => {
                                    const selected = selectedComponentId === comp.id;
                                    return (
                                      <button
                                        key={comp.id}
                                        onClick={() => { setSelectedComponentId(comp.id); setSelectedId(null); }}
                                        className={[
                                          'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                                          selected
                                            ? 'bg-brand-50 dark:bg-brand-500/10'
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5',
                                        ].join(' ')}
                                      >
                                        <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: col.border, opacity: selected ? 1 : 0.4 }} />
                                        <div className="min-w-0 flex-1">
                                          <p className={`truncate text-xs font-medium ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>{comp.name}</p>
                                          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{comp.u_height}U · {comp.location}{comp.side ? ` · ${comp.side}` : ''}</p>
                                        </div>
                                      </button>
                                    );
                                  })}
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
              <>
                {/* YAML button strip */}
                <div className="shrink-0 flex items-center justify-end border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                  <button
                    onClick={() => openYamlDrawer(
                      `Rack Template — ${selectedTemplate.name}`,
                      selectedTemplate,
                      async (yaml) => {
                        const parsed = jsYaml.load(yaml) as Record<string, unknown>;
                        await api.updateTemplate({ kind: 'rack', template: parsed });
                        await loadData();
                      }
                    )}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <FileCode2 className="h-3.5 w-3.5" /> Edit YAML
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <EditorPanel key={selectedTemplate.id} template={selectedTemplate} allChecks={checks} rackComponentCatalog={rackComponents} onDraftChange={setPreviewDraft} onSaved={() => { void loadData(); }} />
                </div>
              </>
            ) : selectedComponent ? (
              <>
                <div className="shrink-0 flex items-center justify-end border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                  <button
                    onClick={() => openYamlDrawer(
                      `Component — ${selectedComponent.name}`,
                      selectedComponent,
                      async (yaml) => {
                        const parsed = jsYaml.load(yaml) as Record<string, unknown>;
                        await api.updateTemplate({ kind: 'rack', template: parsed });
                        await loadData();
                      }
                    )}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <FileCode2 className="h-3.5 w-3.5" /> Edit YAML
                  </button>
                </div>
                <RackComponentDetailPanel component={selectedComponent} onSaved={() => { void loadData(); }} />
              </>
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
                {/* Front view — live preview (no save needed) */}
                <div className="flex min-h-0 flex-1 flex-col border-r border-[var(--color-border)]/20">
                  <RackPreview template={previewTemplate ?? selectedTemplate} view="front" rackComponentCatalog={rackComponents} />
                </div>
                {/* Rear view — live preview */}
                <div className="flex min-h-0 flex-1 flex-col">
                  <RackPreview template={previewTemplate ?? selectedTemplate} view="rear" rackComponentCatalog={rackComponents} />
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

      {/* Choice modal */}
      {showChoiceModal && (
        <NewTemplateChoiceModal
          onChoose={(kind) => {
            setShowChoiceModal(false);
            if (kind === 'rack') { setShowNewForm(true); setLeftTab('racks'); }
            else { setShowNewCompForm(true); setLeftTab('components'); }
          }}
          onClose={() => setShowChoiceModal(false)}
        />
      )}

      {/* YAML drawer */}
      <YamlDrawer
        open={drawerOpen}
        title={drawerTitle}
        initialYaml={drawerYaml}
        onSave={drawerOnSaveRef.current}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
