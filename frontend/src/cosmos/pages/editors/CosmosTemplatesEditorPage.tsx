import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Server,
  HardDrive,
  Network,
  Zap,
  Wind,
  Box,
  Tag,
  X,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Search,
  LayoutGrid,
} from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  EmptyState,
  LoadingState,
  ErrorState,
} from '../templates/EmptyPage';
import { api } from '../../../services/api';
import type { DeviceTemplate, LayoutConfig, CheckDefinition } from '../../../types';

// ── Type definitions ───────────────────────────────────────────────────────────

type DeviceType = 'server' | 'storage' | 'network' | 'pdu' | 'cooling' | 'other';

// ── Type color mapping ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  DeviceType,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  server: {
    label: 'Server',
    icon: Server,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
  },
  storage: {
    label: 'Storage',
    icon: HardDrive,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  network: {
    label: 'Network',
    icon: Network,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/30',
  },
  pdu: {
    label: 'PDU',
    icon: Zap,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-200 dark:border-yellow-500/30',
  },
  cooling: {
    label: 'Cooling',
    icon: Wind,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    border: 'border-teal-200 dark:border-teal-500/30',
  },
  other: {
    label: 'Other',
    icon: Box,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
  },
};

const normalizeType = (type: string): DeviceType => {
  const lower = type.toLowerCase();
  if (lower in TYPE_CONFIG) return lower as DeviceType;
  return 'other';
};

// ── Layout preview ─────────────────────────────────────────────────────────────

const LayoutPreview = ({
  layout,
  variant = 'front',
}: {
  layout: LayoutConfig;
  variant?: 'front' | 'rear';
}) => {
  const isFront = variant === 'front';
  const cellCls = isFront
    ? 'flex items-center justify-center rounded border border-brand-200 bg-brand-50 text-[10px] font-semibold text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400'
    : 'flex items-center justify-center rounded border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400';

  const matrix = layout.matrix ?? [];

  return (
    <div
      className="inline-grid gap-0.5"
      style={{
        gridTemplateColumns: `repeat(${layout.cols}, 24px)`,
        gridTemplateRows: `repeat(${layout.rows}, 24px)`,
      }}
    >
      {matrix.map((row, ri) =>
        row.map((slot, ci) => (
          <div key={`${ri}-${ci}`} className={cellCls}>
            {slot}
          </div>
        ))
      )}
    </div>
  );
};

// ── New template modal ─────────────────────────────────────────────────────────

interface NewTemplateModalProps {
  onClose: () => void;
  onCreated: (template: DeviceTemplate) => void;
}

const NewTemplateModal = ({ onClose, onCreated }: NewTemplateModalProps) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [type, setType] = useState<DeviceType>('server');
  const [uHeight, setUHeight] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoId = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const finalId = id.trim() || autoId;
    if (!finalId) {
      setError('ID is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createTemplate({
        kind: 'device',
        template: { id: finalId, name: name.trim(), type, u_height: uHeight },
      });
      onCreated({ id: finalId, name: name.trim(), type, u_height: uHeight });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template.');
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';
  const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            New Device Template
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              type="text"
              placeholder="e.g. Dell PowerEdge R750"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>ID</label>
            <input
              type="text"
              placeholder={autoId || 'e.g. dell-poweredge-r750'}
              value={id}
              onChange={(e) => setId(e.target.value)}
              className={`${inputCls} font-mono`}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Leave blank to auto-generate from name.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DeviceType)}
                className={inputCls}
              >
                {(Object.keys(TYPE_CONFIG) as DeviceType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>U Height</label>
              <input
                type="number"
                min={1}
                max={42}
                value={uHeight}
                onChange={(e) => setUHeight(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Left panel — template list ─────────────────────────────────────────────────

interface TemplateListProps {
  templates: DeviceTemplate[];
  selectedId: string | null;
  onSelect: (template: DeviceTemplate) => void;
}

const TemplateList = ({ templates, selectedId, onSelect }: TemplateListProps) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = templates.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || normalizeType(t.type) === typeFilter;
    return matchSearch && matchType;
  });

  const grouped: Record<string, DeviceTemplate[]> = {};
  for (const t of filtered) {
    const key = normalizeType(t.type);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const typeOrder: DeviceType[] = ['server', 'storage', 'network', 'pdu', 'cooling', 'other'];
  const sortedGroups = typeOrder.filter((k) => grouped[k]?.length);

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      {/* Type filter chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setTypeFilter(null)}
          className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors ${
            !typeFilter
              ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
          }`}
        >
          All
        </button>
        {(Object.keys(TYPE_CONFIG) as DeviceType[]).map((t) => {
          const cfg = TYPE_CONFIG[t];
          const active = typeFilter === t;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(active ? null : t)}
              className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors ${
                active
                  ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Groups */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {sortedGroups.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-600">
            No templates found.
          </p>
        )}
        {sortedGroups.map((groupKey) => {
          const items = grouped[groupKey];
          const cfg = TYPE_CONFIG[groupKey as DeviceType];
          const Icon = cfg.icon;
          const isCollapsed = collapsed[groupKey];

          return (
            <div key={groupKey}>
              <button
                onClick={() => toggleGroup(groupKey)}
                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${cfg.color} ${cfg.bg} ${cfg.border}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">{cfg.label}</span>
                <span className="font-mono text-[10px] opacity-60">{items.length}</span>
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3 opacity-60" />
                ) : (
                  <ChevronDown className="h-3 w-3 opacity-60" />
                )}
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map((tpl) => {
                    const isSelected = tpl.id === selectedId;
                    const layoutInfo = tpl.layout
                      ? `${tpl.layout.rows}×${tpl.layout.cols}`
                      : null;

                    return (
                      <button
                        key={tpl.id}
                        onClick={() => onSelect(tpl)}
                        className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-500/10'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${
                              isSelected
                                ? 'text-brand-600 dark:text-brand-400'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {tpl.name}
                          </p>
                          <p className="truncate font-mono text-[10px] text-gray-400 dark:text-gray-500">
                            {tpl.id}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[10px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                            {tpl.u_height}U
                          </span>
                          {layoutInfo && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                              <LayoutGrid className="h-3 w-3" />
                              {layoutInfo}
                            </span>
                          )}
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
    </div>
  );
};

// ── Check tag ──────────────────────────────────────────────────────────────────

const CheckTag = ({ id, onRemove }: { id: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
    <Tag className="h-3 w-3 text-gray-400 dark:text-gray-500" />
    {id}
    <button
      onClick={onRemove}
      className="ml-0.5 rounded text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
    >
      <X className="h-3 w-3" />
    </button>
  </span>
);

// ── Layout editor section ──────────────────────────────────────────────────────

interface LayoutEditorProps {
  label: string;
  layout: LayoutConfig | undefined;
  variant: 'front' | 'rear';
  onChange: (layout: LayoutConfig | undefined) => void;
}

const buildMatrix = (rows: number, cols: number): number[][] => {
  let slot = 1;
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => slot++));
};

const LayoutEditor = ({ label, layout, variant, onChange }: LayoutEditorProps) => {
  const [enabled, setEnabled] = useState(!!layout);
  const [rows, setRows] = useState(layout?.rows ?? 2);
  const [cols, setCols] = useState(layout?.cols ?? 2);

  const handleToggle = (val: boolean) => {
    setEnabled(val);
    if (!val) {
      onChange(undefined);
    } else {
      onChange({ type: 'grid', rows, cols, matrix: buildMatrix(rows, cols) });
    }
  };

  const handleDimensionChange = (newRows: number, newCols: number) => {
    setRows(newRows);
    setCols(newCols);
    if (enabled) {
      onChange({ type: 'grid', rows: newRows, cols: newCols, matrix: buildMatrix(newRows, newCols) });
    }
  };

  const inputCls =
    'w-16 rounded-xl border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white';

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <button
          type="button"
          onClick={() => handleToggle(!enabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            enabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Rows</label>
              <input
                type="number"
                min={1}
                max={16}
                value={rows}
                onChange={(e) => handleDimensionChange(Number(e.target.value), cols)}
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Cols</label>
              <input
                type="number"
                min={1}
                max={16}
                value={cols}
                onChange={(e) => handleDimensionChange(rows, Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          {layout && (
            <div>
              <p className="mb-1.5 text-xs text-gray-400 dark:text-gray-500">Preview</p>
              <LayoutPreview layout={layout} variant={variant} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Template editor panel ──────────────────────────────────────────────────────

interface TemplateEditorProps {
  template: DeviceTemplate;
  availableChecks: CheckDefinition[];
  onSaved: (updated: DeviceTemplate) => void;
}

const TemplateEditor = ({ template, availableChecks, onSaved }: TemplateEditorProps) => {
  const [draft, setDraft] = useState<DeviceTemplate>({ ...template });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkSearch, setCheckSearch] = useState('');

  useEffect(() => {
    setDraft({ ...template });
    setDirty(false);
    setSaveError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const update = <K extends keyof DeviceTemplate>(key: K, value: DeviceTemplate[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateTemplate({
        kind: 'device',
        template: draft as unknown as Record<string, unknown>,
      });
      setDirty(false);
      onSaved(draft);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft({ ...template });
    setDirty(false);
    setSaveError(null);
  };

  const removeCheck = (id: string) => {
    update(
      'checks',
      (draft.checks ?? []).filter((c) => c !== id)
    );
  };

  const addCheck = (id: string) => {
    if (!(draft.checks ?? []).includes(id)) {
      update('checks', [...(draft.checks ?? []), id]);
    }
    setCheckSearch('');
  };

  const suggestedChecks = availableChecks.filter(
    (c) =>
      !(draft.checks ?? []).includes(c.id) &&
      (checkSearch === '' ||
        c.id.toLowerCase().includes(checkSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(checkSearch.toLowerCase()))
  );

  const inputCls =
    'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';
  const labelCls =
    'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

  return (
    <div className="space-y-4">
      {/* Panel header with save/discard */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {draft.name}
          </p>
          <p className="font-mono text-xs text-gray-400 dark:text-gray-500">{draft.id}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              Unsaved
            </span>
          )}
          <button
            onClick={handleDiscard}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {saveError}
        </div>
      )}

      {/* Identity */}
      <SectionCard title="Identity" desc="Core properties of this template.">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => update('name', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>ID</label>
              <input
                type="text"
                value={draft.id}
                readOnly
                className={`${inputCls} cursor-not-allowed font-mono opacity-60`}
              />
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-600">Read-only</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select
                value={draft.type}
                onChange={(e) => update('type', e.target.value)}
                className={inputCls}
              >
                {(Object.keys(TYPE_CONFIG) as DeviceType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>U Height</label>
              <input
                type="number"
                min={1}
                max={42}
                value={draft.u_height}
                onChange={(e) => update('u_height', Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          {normalizeType(draft.type) === 'storage' && (
            <div>
              <label className={labelCls}>Storage Type</label>
              <input
                type="text"
                value={draft.storage_type ?? ''}
                onChange={(e) => update('storage_type', e.target.value || null)}
                placeholder="e.g. eseries, netapp, ddn"
                className={`${inputCls} font-mono`}
              />
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-600">
                Optional. Used for vendor-specific behavior in checks.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Front layout */}
      <SectionCard
        title="Front Layout"
        desc="Grid layout for the front panel (compute nodes, blades)."
      >
        <LayoutEditor
          label="Front panel"
          layout={draft.layout}
          variant="front"
          onChange={(l) => update('layout', l)}
        />
      </SectionCard>

      {/* Rear layout */}
      <SectionCard title="Rear Layout" desc="Optional rear panel layout (PSUs, IO modules).">
        <LayoutEditor
          label="Rear panel"
          layout={draft.rear_layout}
          variant="rear"
          onChange={(l) => update('rear_layout', l)}
        />
      </SectionCard>

      {/* Checks */}
      <SectionCard title="Health Checks" desc="Check IDs assigned to this template.">
        <div className="space-y-3">
          {/* Assigned checks */}
          <div className="flex min-h-8 flex-wrap gap-1.5">
            {(draft.checks ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600">No checks assigned.</p>
            ) : (
              (draft.checks ?? []).map((checkId) => (
                <CheckTag key={checkId} id={checkId} onRemove={() => removeCheck(checkId)} />
              ))
            )}
          </div>

          {/* Add check */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search and add a check…"
              value={checkSearch}
              onChange={(e) => setCheckSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {checkSearch && suggestedChecks.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              {suggestedChecks.slice(0, 12).map((c) => (
                <button
                  key={c.id}
                  onClick={() => addCheck(c.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{c.id}</span>
                  {c.name && (
                    <span className="truncate text-xs text-gray-400 dark:text-gray-500">
                      — {c.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {checkSearch && suggestedChecks.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-600">No matching checks found.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

export const CosmosTemplatesEditorPage = () => {
  usePageTitle('Device Templates');

  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeviceTemplate | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogData, checksData] = await Promise.all([api.getCatalog(), api.getChecks()]);
      setTemplates(catalogData.device_templates ?? []);
      setChecks(checksData.checks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreated = (tpl: DeviceTemplate) => {
    setTemplates((prev) => [...prev, tpl]);
    setSelected(tpl);
    setShowNewModal(false);
  };

  const handleSaved = (updated: DeviceTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelected(updated);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Device Templates"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'Editors', href: '#' },
              { label: 'Device Templates' },
            ]}
          />
        }
        actions={
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        }
      />

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <LoadingState message="Loading templates…" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <ErrorState message={error} onRetry={loadData} />
        </div>
      )}

      {!loading && !error && (
        <div className="flex items-start gap-4">
          {/* Left panel */}
          <div className="w-72 shrink-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            {templates.length === 0 ? (
              <EmptyState
                title="No templates yet"
                description="Create your first device template."
                action={
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                  >
                    <Plus className="h-4 w-4" />
                    New Template
                  </button>
                }
              />
            ) : (
              <TemplateList
                templates={templates}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            )}
          </div>

          {/* Right panel */}
          <div className="min-w-0 flex-1">
            {selected ? (
              <TemplateEditor
                key={selected.id}
                template={selected}
                availableChecks={checks}
                onSaved={handleSaved}
              />
            ) : (
              <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <EmptyState
                  title="No template selected"
                  description="Select a template from the list to edit it."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {showNewModal && (
        <NewTemplateModal onClose={() => setShowNewModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
};
