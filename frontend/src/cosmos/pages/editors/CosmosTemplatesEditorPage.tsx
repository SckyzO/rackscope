import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import yaml from 'js-yaml';
import { api } from '../../../services/api';
import type { DeviceTemplate, CheckDefinition } from '../../../types';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type RearComponent = { id: string; name: string; type: string };

type DeviceDraft = {
  id: string;
  name: string;
  type: string;
  u_height: string;
  rows: string;
  cols: string;
  layout_matrix: number[][];
  rear_enabled: boolean;
  rear_rows: string;
  rear_cols: string;
  rear_layout_matrix: number[][];
  rear_components: RearComponent[];
  checks: string[];
};

const DEFAULT_DRAFT: DeviceDraft = {
  id: '',
  name: '',
  type: 'server',
  u_height: '1',
  rows: '1',
  cols: '1',
  layout_matrix: [[1]],
  rear_enabled: false,
  rear_rows: '1',
  rear_cols: '1',
  rear_layout_matrix: [[1]],
  rear_components: [],
  checks: [],
};

const buildMatrix = (rows: number, cols: number): number[][] => {
  let n = 1;
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => n++));
};

const toDraft = (tpl: DeviceTemplate): DeviceDraft => ({
  id: tpl.id,
  name: tpl.name,
  type: tpl.type || 'server',
  u_height: String(tpl.u_height || 1),
  rows: String(tpl.layout?.rows || 1),
  cols: String(tpl.layout?.cols || 1),
  layout_matrix: tpl.layout?.matrix ?? buildMatrix(tpl.layout?.rows ?? 1, tpl.layout?.cols ?? 1),
  rear_enabled: Boolean(tpl.rear_layout),
  rear_rows: String(tpl.rear_layout?.rows || 1),
  rear_cols: String(tpl.rear_layout?.cols || 1),
  rear_layout_matrix:
    tpl.rear_layout?.matrix ?? buildMatrix(tpl.rear_layout?.rows ?? 1, tpl.rear_layout?.cols ?? 1),
  rear_components: (tpl.rear_components || []).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  })),
  checks: tpl.checks || [],
});

const draftToTemplate = (draft: DeviceDraft): Record<string, unknown> => {
  const rows = parseInt(draft.rows) || 1;
  const cols = parseInt(draft.cols) || 1;
  const template: Record<string, unknown> = {
    id: draft.id.trim() || 'template-id',
    name: draft.name.trim() || 'Template name',
    type: draft.type || 'server',
    u_height: parseInt(draft.u_height) || 1,
    layout: { type: 'grid', rows, cols, matrix: draft.layout_matrix },
    checks: draft.checks,
  };
  if (draft.rear_enabled) {
    const rr = parseInt(draft.rear_rows) || 1;
    const rc = parseInt(draft.rear_cols) || 1;
    template.rear_layout = {
      type: 'grid',
      rows: rr,
      cols: rc,
      matrix: draft.rear_layout_matrix,
    };
    template.rear_components = draft.rear_components;
  }
  return template;
};

// ---------------------------------------------------------------------------
// Module-level sub-components
// ---------------------------------------------------------------------------

type MatrixCellProps = { value: number; onClick: () => void };

const MatrixCell = ({ value, onClick }: MatrixCellProps) => (
  <button
    onClick={onClick}
    className={`flex h-10 w-10 items-center justify-center rounded border font-mono text-sm font-bold transition-all ${
      value > 0
        ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25'
        : 'border-white/10 bg-black/40 text-gray-600 hover:border-white/20 hover:text-gray-400'
    }`}
  >
    {value > 0 ? value : '·'}
  </button>
);

type MatrixBuilderProps = {
  rows: number;
  cols: number;
  matrix: number[][];
  onChange: (m: number[][]) => void;
};

const MatrixBuilder = ({ rows, cols, matrix, onChange }: MatrixBuilderProps) => {
  const nextSlot = useMemo(() => {
    const flat = matrix.flat();
    return flat.length > 0 ? Math.max(...flat) + 1 : 1;
  }, [matrix]);

  const toggle = (r: number, c: number) => {
    const cur = matrix[r]?.[c] ?? 0;
    onChange(
      matrix.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? (cur > 0 ? 0 : nextSlot) : cell))
      )
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
          Layout Matrix
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => onChange(buildMatrix(rows, cols))}
            className="font-mono text-[10px] tracking-widest text-gray-500 uppercase hover:text-[var(--color-accent)]"
          >
            Auto-fill
          </button>
          <button
            onClick={() =>
              onChange(Array.from({ length: rows }, () => Array<number>(cols).fill(0)))
            }
            className="font-mono text-[10px] tracking-widest text-gray-500 uppercase hover:text-[var(--color-accent)]"
          >
            Clear
          </button>
        </div>
      </div>
      <p className="font-mono text-[9px] text-gray-600">Click to assign slot numbers</p>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)` }}>
        {matrix.map((row, r) =>
          row.map((val, c) => (
            <MatrixCell key={`${r}-${c}`} value={val} onClick={() => toggle(r, c)} />
          ))
        )}
      </div>
      <p className="font-mono text-[9px] text-gray-500">
        {matrix.flat().filter((s) => s > 0).length}/{rows * cols} slots
      </p>
    </div>
  );
};

type DevicePreviewProps = {
  matrix: number[][];
  uHeight: number;
  label: string;
};

const DevicePreview = ({ matrix, uHeight, label }: DevicePreviewProps) => {
  const pxPerU = 48;
  const height = Math.max(uHeight * pxPerU, 48);

  if (matrix.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center font-mono text-[11px] tracking-widest text-gray-500 uppercase">
        Invalid layout
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase">
        {label}
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
        <div className="flex gap-2">
          {/* Left ruler */}
          <div className="flex w-6 flex-col font-mono text-[9px] text-gray-600" style={{ height }}>
            {Array.from({ length: uHeight }, (_, i) => (
              <div
                key={i}
                className="flex flex-1 items-center justify-center border-b border-white/10"
              >
                {i + 1}
              </div>
            ))}
          </div>
          {/* Grid */}
          <div
            className="flex-1 rounded-xl border border-white/10 bg-black/40 p-2"
            style={{ height }}
          >
            <div
              className="grid h-full gap-1"
              style={{
                gridTemplateRows: `repeat(${matrix.length}, minmax(0, 1fr))`,
              }}
            >
              {matrix.map((row, ri) => (
                <div
                  key={ri}
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                  }}
                >
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className={`flex items-center justify-center rounded border font-mono text-[10px] ${
                        cell > 0
                          ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                          : 'border-white/5 bg-black/20 text-gray-700'
                      }`}
                    >
                      {cell > 0 ? cell : ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Right ruler */}
          <div className="flex w-6 flex-col font-mono text-[9px] text-gray-600" style={{ height }}>
            {Array.from({ length: uHeight }, (_, i) => (
              <div
                key={i}
                className="flex flex-1 items-center justify-center border-b border-white/10"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const CosmosTemplatesEditorPage = () => {
  const [draft, setDraft] = useState<DeviceDraft>(DEFAULT_DRAFT);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showYaml, setShowYaml] = useState(false);
  const [yamlText, setYamlText] = useState('');
  const [yamlErrors, setYamlErrors] = useState<string[]>([]);
  const [yamlValidationErrors, setYamlValidationErrors] = useState<string[]>([]);
  const [yamlSource, setYamlSource] = useState<'form' | 'editor'>('form');
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const yamlTimer = useRef<number | null>(null);

  // Load catalog + checks
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

  const applyTemplate = useCallback((tpl: DeviceTemplate) => {
    setSelectedId(tpl.id);
    setIsEditing(true);
    setDraft(toDraft(tpl));
    setStatus('idle');
    setError(null);
    setYamlErrors([]);
    setYamlValidationErrors([]);
    setYamlSource('form');
  }, []);

  const yamlPreview = useMemo(() => {
    const tmpl = draftToTemplate(draft);
    try {
      return yaml.dump({ templates: [tmpl] }, { noRefs: true, lineWidth: 120 });
    } catch {
      return '';
    }
  }, [draft]);

  const validateYaml = useCallback(async (text: string) => {
    const errors: string[] = [];
    let parsed: Record<string, unknown> | null = null;
    try {
      const data = yaml.load(text);
      if (!data || typeof data !== 'object') {
        errors.push('Must be a YAML object.');
      } else if (!Array.isArray((data as { templates?: unknown }).templates)) {
        errors.push('Must have templates: [...]');
      } else {
        const arr = (data as { templates: unknown[] }).templates;
        if (!arr.length || typeof arr[0] !== 'object' || !arr[0]) {
          errors.push('templates must have one entry');
        } else {
          parsed = arr[0] as Record<string, unknown>;
        }
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Invalid YAML');
    }
    setYamlErrors(errors);
    if (errors.length > 0) return;
    if (parsed) {
      try {
        setDraft(toDraft(parsed as DeviceTemplate));
      } catch {
        // ignore draft conversion errors
      }
      try {
        await api.validateTemplate({ kind: 'device', template: parsed });
        setYamlValidationErrors([]);
      } catch (e) {
        setYamlValidationErrors([e instanceof Error ? e.message : 'Validation failed']);
      }
    }
  }, []);

  useEffect(() => {
    if (!showYaml) return;
    if (yamlTimer.current) window.clearTimeout(yamlTimer.current);
    const text = yamlSource === 'editor' ? yamlText : yamlPreview;
    yamlTimer.current = window.setTimeout(() => {
      void validateYaml(text);
    }, 400);
    return () => {
      if (yamlTimer.current) window.clearTimeout(yamlTimer.current);
    };
  }, [showYaml, yamlSource, yamlText, yamlPreview, validateYaml]);

  const updateDimensions = (rows: number, cols: number) => {
    const newMatrix = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => draft.layout_matrix[r]?.[c] ?? 0)
    );
    setDraft((d) => ({
      ...d,
      rows: String(rows),
      cols: String(cols),
      layout_matrix: newMatrix,
    }));
  };

  const updateRearDimensions = (rows: number, cols: number) => {
    const newMatrix = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => draft.rear_layout_matrix[r]?.[c] ?? 0)
    );
    setDraft((d) => ({
      ...d,
      rear_rows: String(rows),
      rear_cols: String(cols),
      rear_layout_matrix: newMatrix,
    }));
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!draft.id.trim()) errors.push('Template ID is required.');
    if (!draft.name.trim()) errors.push('Name is required.');
    const u = parseInt(draft.u_height);
    if (!u || u <= 0) errors.push('U height must be > 0');
    const r = parseInt(draft.rows);
    if (!r || r <= 0) errors.push('Rows must be > 0');
    const c = parseInt(draft.cols);
    if (!c || c <= 0) errors.push('Cols must be > 0');
    if (!isEditing && templates.some((t) => t.id === draft.id.trim()))
      errors.push('ID already exists.');
    return errors;
  }, [draft, isEditing, templates]);

  const handleSave = async () => {
    if (validationErrors.length > 0) return;
    setStatus('saving');
    setError(null);
    try {
      const template = draftToTemplate(draft);
      if (isEditing) {
        await api.updateTemplate({ kind: 'device', template });
      } else {
        await api.createTemplate({ kind: 'device', template });
      }
      const catalog = await api.getCatalog();
      setTemplates(catalog?.device_templates ?? []);
      setIsEditing(true);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setStatus('error');
    }
  };

  const uHeight = parseInt(draft.u_height) || 1;
  const rows = parseInt(draft.rows) || 1;
  const cols = parseInt(draft.cols) || 1;
  const rearRows = parseInt(draft.rear_rows) || 1;
  const rearCols = parseInt(draft.rear_cols) || 1;
  const canSave = validationErrors.length === 0;

  const inputCls =
    'mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200 focus:border-[var(--color-accent)]/50 focus:outline-none';
  const labelCls = 'block text-xs text-gray-400';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[0.45em] text-gray-500 uppercase">
            Templates
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-base)] uppercase">
            Editor
          </h1>
          <div className="mt-1 font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase">
            Device template
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedId('');
              setIsEditing(false);
              setDraft(DEFAULT_DRAFT);
              setStatus('idle');
              setError(null);
            }}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 font-mono text-[10px] tracking-widest text-gray-400 uppercase transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
          >
            New
          </button>
          <button
            onClick={() => {
              setShowYaml((p) => !p);
              setYamlSource('form');
            }}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 font-mono text-[10px] tracking-widest text-gray-400 uppercase transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
          >
            {showYaml ? 'Hide YAML' : 'Show YAML'}
          </button>
          <button
            onClick={() => {
              void handleSave();
            }}
            disabled={!canSave || status === 'saving'}
            className={`rounded-lg px-4 py-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors ${
              canSave
                ? 'border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25'
                : 'cursor-not-allowed border border-white/10 bg-white/5 text-gray-500'
            }`}
          >
            {status === 'saving'
              ? 'Saving...'
              : status === 'saved'
                ? 'Saved ✓'
                : isEditing
                  ? 'Update'
                  : 'Save'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        {/* LEFT: Form */}
        <section className="space-y-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
          <h2 className="text-lg font-bold tracking-[0.2em] text-gray-200 uppercase">
            Device Template
          </h2>

          {/* Load existing */}
          <label className={labelCls}>
            Load existing
            <select
              value={selectedId}
              onChange={(e) => {
                const tpl = templates.find((t) => t.id === e.target.value);
                if (tpl) {
                  applyTemplate(tpl);
                } else {
                  setSelectedId('');
                  setIsEditing(false);
                  setDraft(DEFAULT_DRAFT);
                }
              }}
              className={inputCls}
            >
              <option value="">— New device template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <label className={labelCls}>
              Template ID *
              <input
                value={draft.id}
                onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
                disabled={isEditing}
                placeholder="my-device-1u-3n"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Name *
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="My Device"
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className={labelCls}>
              Type
              <select
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                className={inputCls}
              >
                {['server', 'storage', 'network', 'pdu', 'cooling', 'other'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              U Height
              <input
                type="number"
                min={1}
                max={42}
                value={draft.u_height}
                onChange={(e) => setDraft((d) => ({ ...d, u_height: e.target.value }))}
                className={inputCls}
              />
            </label>
          </div>

          {/* Layout dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <label className={labelCls}>
              Layout rows
              <input
                type="number"
                min={1}
                max={20}
                value={draft.rows}
                onChange={(e) => updateDimensions(parseInt(e.target.value) || 1, cols)}
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Layout cols
              <input
                type="number"
                min={1}
                max={20}
                value={draft.cols}
                onChange={(e) => updateDimensions(rows, parseInt(e.target.value) || 1)}
                className={inputCls}
              />
            </label>
          </div>

          {/* Front matrix builder */}
          <MatrixBuilder
            rows={rows}
            cols={cols}
            matrix={draft.layout_matrix}
            onChange={(matrix) => setDraft((d) => ({ ...d, layout_matrix: matrix }))}
          />

          {/* Rear layout */}
          <div className="space-y-3 border-t border-white/5 pt-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase">
                Rear layout
              </span>
              <button
                onClick={() => setDraft((d) => ({ ...d, rear_enabled: !d.rear_enabled }))}
                className="font-mono text-[10px] font-bold tracking-widest text-gray-400 uppercase hover:text-[var(--color-accent)]"
              >
                {draft.rear_enabled ? 'Disable' : 'Enable'}
              </button>
            </div>

            {draft.rear_enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelCls}>
                    Rear rows
                    <input
                      type="number"
                      min={1}
                      value={draft.rear_rows}
                      onChange={(e) =>
                        updateRearDimensions(parseInt(e.target.value) || 1, rearCols)
                      }
                      className={inputCls}
                    />
                  </label>
                  <label className={labelCls}>
                    Rear cols
                    <input
                      type="number"
                      min={1}
                      value={draft.rear_cols}
                      onChange={(e) =>
                        updateRearDimensions(rearRows, parseInt(e.target.value) || 1)
                      }
                      className={inputCls}
                    />
                  </label>
                </div>

                <MatrixBuilder
                  rows={rearRows}
                  cols={rearCols}
                  matrix={draft.rear_layout_matrix}
                  onChange={(matrix) => setDraft((d) => ({ ...d, rear_layout_matrix: matrix }))}
                />

                {/* Rear components */}
                <div className="space-y-2">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                    Rear components
                  </div>
                  {draft.rear_components.map((comp, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
                      <input
                        value={comp.id}
                        placeholder="id"
                        onChange={(e) =>
                          setDraft((d) => {
                            const rc = [...d.rear_components];
                            rc[i] = { ...rc[i], id: e.target.value };
                            return { ...d, rear_components: rc };
                          })
                        }
                        className={inputCls + ' mt-0'}
                      />
                      <input
                        value={comp.name}
                        placeholder="name"
                        onChange={(e) =>
                          setDraft((d) => {
                            const rc = [...d.rear_components];
                            rc[i] = { ...rc[i], name: e.target.value };
                            return { ...d, rear_components: rc };
                          })
                        }
                        className={inputCls + ' mt-0'}
                      />
                      <select
                        value={comp.type}
                        onChange={(e) =>
                          setDraft((d) => {
                            const rc = [...d.rear_components];
                            rc[i] = { ...rc[i], type: e.target.value };
                            return { ...d, rear_components: rc };
                          })
                        }
                        className={inputCls + ' mt-0'}
                      >
                        {['psu', 'fan', 'io', 'hydraulics', 'other'].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            rear_components: d.rear_components.filter((_, j) => j !== i),
                          }))
                        }
                        className="text-gray-600 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        rear_components: [...d.rear_components, { id: '', name: '', type: 'psu' }],
                      }))
                    }
                    className="font-mono text-[10px] tracking-widest text-gray-400 uppercase hover:text-[var(--color-accent)]"
                  >
                    + Add rear component
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Checks */}
          <div className="space-y-2 border-t border-white/5 pt-5">
            <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
              Checks (node/chassis)
            </div>
            <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {checks
                .filter((c) => c.scope === 'node' || c.scope === 'chassis')
                .map((check) => {
                  const on = draft.checks.includes(check.id);
                  return (
                    <label
                      key={check.id}
                      className="flex cursor-pointer items-center gap-2 text-xs text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            checks: e.target.checked
                              ? [...d.checks, check.id]
                              : d.checks.filter((id) => id !== check.id),
                          }))
                        }
                        className="rounded border-gray-600 bg-black/40 accent-[var(--color-accent)]"
                      />
                      <span className="truncate">{check.name || check.id}</span>
                      <span className="ml-auto text-[9px] text-gray-600 uppercase">
                        {check.scope}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-1 text-[11px] text-yellow-400">
              {validationErrors.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          )}
          {error && <div className="text-[11px] text-red-400">{error}</div>}
        </section>

        {/* RIGHT: Preview */}
        <aside className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
          <div className="font-mono text-[10px] tracking-[0.35em] text-gray-500 uppercase">
            Preview
          </div>
          <h2 className="mb-4 text-lg font-bold tracking-[0.2em] text-gray-200 uppercase">
            {showYaml ? 'YAML' : 'Device Layout'}
          </h2>

          {showYaml ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <Editor
                  height="520px"
                  defaultLanguage="yaml"
                  value={yamlSource === 'editor' ? yamlText : yamlPreview}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                  }}
                  onChange={(value) => {
                    setYamlSource('editor');
                    setYamlText(value ?? '');
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    wordWrap: 'on',
                    tabSize: 2,
                    padding: { top: 12, bottom: 12 },
                  }}
                  theme="vs-dark"
                />
              </div>
              {[...yamlErrors, ...yamlValidationErrors].map((msg, i) => (
                <div key={i} className="font-mono text-[11px] text-yellow-400">
                  {msg}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <DevicePreview matrix={draft.layout_matrix} uHeight={uHeight} label="Front" />
              {draft.rear_enabled ? (
                <DevicePreview matrix={draft.rear_layout_matrix} uHeight={uHeight} label="Rear" />
              ) : (
                <div className="rounded-2xl border border-dashed border-white/5 p-4 text-center">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-gray-600 uppercase">
                    Rear layout disabled
                  </p>
                  <button
                    onClick={() => setDraft((d) => ({ ...d, rear_enabled: true }))}
                    className="mt-2 font-mono text-[10px] tracking-widest text-gray-500 uppercase hover:text-[var(--color-accent)]"
                  >
                    Enable
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
