import { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Layers,
  Network,
  Zap,
  Thermometer,
  Check,
  X,
  Plus,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { DeviceChassis } from '../../../components/RackVisualizer';
import { api } from '../../../services/api';
import type { DeviceTemplate, CheckDefinition } from '../../../types';

// ---------------------------------------------------------------------------
// Draft state for the form
// ---------------------------------------------------------------------------

type Draft = {
  id: string;
  name: string;
  type: string;
  u_height: number;
  rows: number;
  cols: number;
  matrix: number[][];
  checks: string[];
};

const DEFAULT_DRAFT: Draft = {
  id: '',
  name: '',
  type: 'server',
  u_height: 1,
  rows: 1,
  cols: 1,
  matrix: [[1]],
  checks: [],
};

// Build auto-fill matrix: sequential slot numbers in reading order
const buildMatrix = (rows: number, cols: number): number[][] => {
  let n = 1;
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => n++));
};

// Convert draft to DeviceTemplate for preview
const draftToTemplate = (draft: Draft): DeviceTemplate => ({
  id: draft.id || 'preview',
  name: draft.name || 'Preview',
  type: draft.type,
  u_height: draft.u_height,
  layout: {
    type: 'grid',
    rows: draft.rows,
    cols: draft.cols,
    matrix: draft.matrix,
  },
  checks: draft.checks,
});

// Mock device for DeviceChassis preview
const PREVIEW_DEVICE = {
  id: 'preview-device',
  name: 'Preview',
  template_id: 'preview',
  u_position: 1,
  instance: {} as Record<number, string>,
  nodes: null as Record<number, string> | null,
  labels: null as Record<string, string> | null,
};

// ---------------------------------------------------------------------------
// TypeIcon — icon per device type
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  server: 'text-brand-400',
  storage: 'text-amber-400',
  network: 'text-blue-400',
  pdu: 'text-yellow-400',
  cooling: 'text-cyan-400',
  other: 'text-gray-400',
};

type TypeIconProps = { type: string; className?: string };
const TypeIcon = ({ type, className }: TypeIconProps) => {
  const cls = `${TYPE_COLORS[type] ?? TYPE_COLORS.other} ${className ?? 'h-4 w-4'}`;
  switch (type) {
    case 'storage':
      return <Layers className={cls} />;
    case 'network':
      return <Network className={cls} />;
    case 'pdu':
      return <Zap className={cls} />;
    case 'cooling':
      return <Thermometer className={cls} />;
    default:
      return <Server className={cls} />;
  }
};

// ---------------------------------------------------------------------------
// MatrixBuilder — interactive grid for assigning slot numbers
// ---------------------------------------------------------------------------

type MatrixBuilderProps = {
  rows: number;
  cols: number;
  matrix: number[][];
  onChange: (matrix: number[][]) => void;
};

const MatrixBuilder = ({ rows, cols, matrix, onChange }: MatrixBuilderProps) => {
  const nextSlot = useMemo(() => {
    const flat = matrix.flat();
    const max = flat.length > 0 ? Math.max(...flat) : 0;
    return max + 1;
  }, [matrix]);

  const handleCellClick = (r: number, c: number) => {
    const current = matrix[r]?.[c] ?? 0;
    const newMatrix = matrix.map((row, ri) =>
      row.map((cell, ci) => {
        if (ri === r && ci === c) return current > 0 ? 0 : nextSlot;
        return cell;
      })
    );
    onChange(newMatrix);
  };

  const handleAutoFill = () => onChange(buildMatrix(rows, cols));
  const handleClear = () => onChange(Array.from({ length: rows }, () => Array(cols).fill(0)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
          Layout Matrix
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleAutoFill}
            className="rounded-lg border border-gray-700 px-2.5 py-1 text-[11px] text-gray-400 hover:border-gray-600 hover:text-gray-200"
          >
            Auto-fill
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-gray-700 px-2.5 py-1 text-[11px] text-gray-400 hover:border-gray-600 hover:text-gray-200"
          >
            Clear
          </button>
        </div>
      </div>
      <p className="text-[11px] text-gray-600">
        Click cells to assign slot numbers. Click again to remove.
      </p>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {matrix.map((row, r) =>
          row.map((slot, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleCellClick(r, c)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold transition-all ${
                slot > 0
                  ? 'border-brand-500 bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
                  : 'border-gray-700 bg-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'
              }`}
            >
              {slot > 0 ? slot : '·'}
            </button>
          ))
        )}
      </div>
      <p className="text-[11px] text-gray-500">
        {matrix.flat().filter((s) => s > 0).length} / {rows * cols} slots assigned
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TemplateListItem — one template in the left panel
// ---------------------------------------------------------------------------

type TemplateListItemProps = {
  template: DeviceTemplate;
  selected: boolean;
  onClick: () => void;
};

const TemplateListItem = ({ template, selected, onClick }: TemplateListItemProps) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
      selected ? 'bg-brand-500/15 ring-brand-500/30 ring-1' : 'hover:bg-gray-800'
    }`}
  >
    <TypeIcon type={template.type} className="h-4 w-4 shrink-0" />
    <div className="min-w-0 flex-1">
      <p
        className={`truncate text-sm font-medium ${selected ? 'text-brand-300' : 'text-gray-300'}`}
      >
        {template.name}
      </p>
      <p className="truncate font-mono text-[10px] text-gray-600">{template.id}</p>
    </div>
    <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
      {template.u_height}U
    </span>
  </button>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const CosmosTemplatesEditorPage = () => {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [previewSide, setPreviewSide] = useState<'front' | 'rear'>('front');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['server']));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load catalog + checks on mount
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [catalog, checksData] = await Promise.all([api.getCatalog(), api.getChecks()]);
        if (!active) return;
        setTemplates(catalog?.device_templates ?? []);
        setChecks(checksData?.checks ?? []);
        setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const reload = async () => {
    const catalog = await api.getCatalog();
    setTemplates(catalog?.device_templates ?? []);
  };

  const selectTemplate = (tpl: DeviceTemplate) => {
    setSelectedId(tpl.id);
    setIsNew(false);
    setValidationErrors([]);
    setDraft({
      id: tpl.id,
      name: tpl.name,
      type: tpl.type,
      u_height: tpl.u_height,
      rows: tpl.layout?.rows ?? 1,
      cols: tpl.layout?.cols ?? 1,
      matrix: tpl.layout?.matrix ?? buildMatrix(tpl.layout?.rows ?? 1, tpl.layout?.cols ?? 1),
      checks: tpl.checks ?? [],
    });
    setPreviewSide('front');
  };

  const startNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setValidationErrors([]);
    setDraft({ ...DEFAULT_DRAFT });
  };

  const updateDimensions = (rows: number, cols: number) => {
    const newMatrix = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => draft.matrix[r]?.[c] ?? 0)
    );
    setDraft((d) => ({ ...d, rows, cols, matrix: newMatrix }));
  };

  const handleSave = async () => {
    setValidationErrors([]);
    setSaveStatus('saving');
    const template = {
      ...draftToTemplate(draft),
      checks: draft.checks,
    };
    try {
      await api.validateTemplate({ kind: 'device', template });
      if (isNew) {
        await api.createTemplate({ kind: 'device', template });
      } else {
        await api.updateTemplate({ kind: 'device', template });
      }
      await reload();
      setIsNew(false);
      setSelectedId(draft.id);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: unknown) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      const typedErr = err as { detail?: { errors?: string[] } };
      if (typedErr.detail?.errors) setValidationErrors(typedErr.detail.errors);
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, DeviceTemplate[]> = {};
    templates.forEach((t) => {
      const key = t.type ?? 'other';
      if (!g[key]) g[key] = [];
      g[key].push(t);
    });
    return g;
  }, [templates]);

  const nodeChecks = checks.filter((c) => c.scope === 'node' || c.scope === 'chassis');

  const previewTemplate = useMemo(() => draftToTemplate(draft), [draft]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-brand-500 h-8 w-8 animate-spin" />
      </div>
    );
  }

  const hasSelection = selectedId !== null || isNew;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-800 bg-gray-950 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 flex h-9 w-9 items-center justify-center rounded-xl">
            <Layers className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Templates Editor</h1>
            <p className="text-xs text-gray-500">Device hardware templates</p>
          </div>
        </div>
        {hasSelection && (
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="h-3 w-3" /> Error
              </span>
            )}
            <button
              onClick={() => void handleSave()}
              disabled={!draft.id.trim() || !draft.name.trim() || saveStatus === 'saving'}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* 3-column body */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: Template list */}
        <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-800 bg-gray-950">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Device Templates
            </span>
            <button
              onClick={startNew}
              className="text-brand-400 hover:text-brand-300"
              title="New template"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-1 p-3">
            {isNew && (
              <div className="border-brand-500/30 bg-brand-500/10 mb-2 rounded-xl border px-3 py-2">
                <p className="text-brand-400 text-xs font-medium">New template (unsaved)</p>
              </div>
            )}
            {Object.entries(grouped)
              .sort()
              .map(([type, items]) => (
                <div key={type}>
                  <button
                    onClick={() =>
                      setExpandedTypes((prev) => {
                        const next = new Set(prev);
                        if (next.has(type)) next.delete(type);
                        else next.add(type);
                        return next;
                      })
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-800"
                  >
                    {expandedTypes.has(type) ? (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                    )}
                    <TypeIcon type={type} className="h-3.5 w-3.5" />
                    <span className="flex-1 text-xs font-semibold text-gray-400 capitalize">
                      {type}
                    </span>
                    <span className="text-[10px] text-gray-600">{items.length}</span>
                  </button>
                  {expandedTypes.has(type) && (
                    <div className="ml-2 space-y-0.5">
                      {items.map((t) => (
                        <TemplateListItem
                          key={t.id}
                          template={t}
                          selected={selectedId === t.id && !isNew}
                          onClick={() => selectTemplate(t)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            {templates.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-gray-600">No templates yet</p>
            )}
          </div>
        </aside>

        {/* CENTER: Form */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-gray-950 p-6">
          {!hasSelection ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Layers className="mx-auto h-12 w-12 text-gray-700" />
                <p className="mt-3 text-sm text-gray-500">Select a template or create a new one</p>
                <button
                  onClick={startNew}
                  className="bg-brand-500 hover:bg-brand-600 mx-auto mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white"
                >
                  <Plus className="h-4 w-4" /> New Template
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-6">
              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  {validationErrors.map((e, i) => (
                    <p key={i} className="flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {e}
                    </p>
                  ))}
                </div>
              )}

              {/* Identity */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">
                  Identity
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500">Template ID *</label>
                    <input
                      value={draft.id}
                      onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
                      disabled={!isNew}
                      placeholder="e.g. bs-xh3140-1u-3n"
                      className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500">Display name *</label>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="e.g. BullSequana XH3140"
                      className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500">Type</label>
                    <select
                      value={draft.type}
                      onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                      className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      {['server', 'storage', 'network', 'pdu', 'cooling', 'other'].map((t) => (
                        <option key={t} value={t} className="capitalize">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500">U Height</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={42}
                        value={draft.u_height}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            u_height: Math.max(1, parseInt(e.target.value) || 1),
                          }))
                        }
                        className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                      <span className="text-sm text-gray-500">U</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Layout */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">
                  Node Layout
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500">Rows</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={draft.rows}
                      onChange={(e) => {
                        const rows = Math.max(1, parseInt(e.target.value) || 1);
                        updateDimensions(rows, draft.cols);
                      }}
                      className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500">Columns</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={draft.cols}
                      onChange={(e) => {
                        const cols = Math.max(1, parseInt(e.target.value) || 1);
                        updateDimensions(draft.rows, cols);
                      }}
                      className="focus:border-brand-500 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
                <MatrixBuilder
                  rows={draft.rows}
                  cols={draft.cols}
                  matrix={draft.matrix}
                  onChange={(matrix) => setDraft((d) => ({ ...d, matrix }))}
                />
              </section>

              {/* Checks */}
              {nodeChecks.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">
                    Associated Checks
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {nodeChecks.map((check) => {
                      const enabled = draft.checks.includes(check.id);
                      return (
                        <label
                          key={check.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all ${
                            enabled
                              ? 'border-brand-500/40 bg-brand-500/10'
                              : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() =>
                              setDraft((d) => ({
                                ...d,
                                checks: enabled
                                  ? d.checks.filter((c) => c !== check.id)
                                  : [...d.checks, check.id],
                              }))
                            }
                            className="accent-brand-500"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-semibold text-gray-300">
                              {check.id}
                            </p>
                            <p className="text-[10px] text-gray-600">{check.scope}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>

        {/* RIGHT: Live preview */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-gray-800 bg-gray-950">
          {hasSelection ? (
            <div className="space-y-4 p-4">
              {/* Front/Rear toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Preview
                </span>
                <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
                  {(['front', 'rear'] as const).map((side) => (
                    <button
                      key={side}
                      onClick={() => setPreviewSide(side)}
                      className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        previewSide === side
                          ? 'bg-brand-500 text-white'
                          : 'text-gray-500 hover:bg-gray-800'
                      }`}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              </div>

              {/* DeviceChassis live preview */}
              <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="w-full" style={{ maxWidth: 220 }}>
                  <DeviceChassis
                    device={PREVIEW_DEVICE}
                    template={previewTemplate}
                    rackHealth="OK"
                    nodesData={{}}
                    isRearView={previewSide === 'rear'}
                    uPosition={1}
                    detailView={true}
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-900 p-3">
                {[
                  { label: 'Type', value: draft.type },
                  { label: 'Height', value: `${draft.u_height}U` },
                  { label: 'Grid', value: `${draft.rows}×${draft.cols}` },
                  {
                    label: 'Nodes',
                    value: draft.matrix.flat().filter((s) => s > 0).length,
                  },
                  { label: 'Checks', value: draft.checks.length },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-mono text-gray-300">{value}</span>
                  </div>
                ))}
              </div>

              {/* Active checks list */}
              {draft.checks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                    Active checks
                  </p>
                  {draft.checks.map((c) => (
                    <div
                      key={c}
                      className="flex items-center justify-between rounded-lg border border-gray-800 px-2.5 py-1.5"
                    >
                      <span className="font-mono text-[11px] text-gray-400">{c}</span>
                      <button
                        onClick={() =>
                          setDraft((d) => ({ ...d, checks: d.checks.filter((x) => x !== c) }))
                        }
                        className="text-gray-600 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <p className="text-xs text-gray-600">Select a template to see the preview</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
