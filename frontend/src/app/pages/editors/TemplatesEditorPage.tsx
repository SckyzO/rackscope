/**
 * TemplatesEditorPage — Device Template Editor
 *
 * Layout: list (w-80, accordion by type) | form (w-[560px]) | preview (flex, dark)
 * Preview: RackElevation with synthetic rack — front on top, rear below
 * Live preview: form edits reflected instantly (no save required)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Server,
  Save,
  X,
  CheckSquare,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  FileCode2,
  Search,
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import jsYaml from 'js-yaml';
import { api } from '../../../services/api';
import type {
  DeviceTemplate,
  DeviceRearComponent,
  CheckDefinition,
  Rack,
  Device,
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
import { RackElevation } from '../../../components/RackVisualizer';
import { PageActionButton } from '../../components/PageActionButton';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  server: { border: '#2563eb', bg: 'rgba(37,99,235,0.12)', text: '#60a5fa' },
  storage: { border: '#d97706', bg: 'rgba(217,119,6,0.12)', text: '#fbbf24' },
  network: { border: '#0891b2', bg: 'rgba(8,145,178,0.12)', text: '#38bdf8' },
  pdu: { border: '#ca8a04', bg: 'rgba(202,138,4,0.12)', text: '#facc15' },
  cooling: { border: '#0d9488', bg: 'rgba(13,148,136,0.12)', text: '#2dd4bf' },
  other: { border: '#374151', bg: 'rgba(55,65,81,0.12)', text: '#9ca3af' },
};
const col = (type: string) => TYPE_COLORS[type] ?? TYPE_COLORS.other;

const STORAGE_TYPES = ['eseries', 'netapp', 'ddn', 'ibm', 'pure', 'other'];
const REAR_COMP_TYPES = ['psu', 'fan', 'io', 'hydraulics', 'other'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type DeviceDraft = {
  name: string;
  id: string;
  type: string;
  storage_type: string;
  role: string;
  u_height: string;
  frontEnabled: boolean;
  frontRows: string;
  frontCols: string;
  frontMatrix: number[][]; // custom slot order — editable via MatrixEditor
  rearEnabled: boolean;
  rearRows: string;
  rearCols: string;
  rearMatrix: number[][];
  rearComponents: DeviceRearComponent[];
  checks: string[];
  tempWarn: string;
  tempCrit: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildMatrix = (rows: number, cols: number): number[][] =>
  Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c2) => r * cols + c2 + 1)
  );

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const toDraft = (tpl: DeviceTemplate): DeviceDraft => {
  const frontLayout = tpl.layout ?? tpl.disk_layout;
  const fr = frontLayout?.rows ?? 1;
  const fc = frontLayout?.cols ?? 1;
  const rr = tpl.rear_layout?.rows ?? 1;
  const rc = tpl.rear_layout?.cols ?? 1;
  return {
    name: tpl.name,
    id: tpl.id,
    type: tpl.type,
    storage_type: tpl.storage_type ?? '',
    role: tpl.role ?? '',
    u_height: String(tpl.u_height ?? 1),
    frontEnabled: !!frontLayout,
    frontRows: String(fr),
    frontCols: String(fc),
    frontMatrix: frontLayout?.matrix ?? buildMatrix(fr, fc),
    rearEnabled: !!tpl.rear_layout,
    rearRows: String(rr),
    rearCols: String(rc),
    rearMatrix: tpl.rear_layout?.matrix ?? buildMatrix(rr, rc),
    rearComponents: tpl.rear_components ?? [],
    checks: tpl.checks ?? [],
    tempWarn: String(tpl.display_thresholds?.temperature?.warn ?? ''),
    tempCrit: String(tpl.display_thresholds?.temperature?.crit ?? ''),
  };
};

const draftToTemplate = (draft: DeviceDraft, _base?: DeviceTemplate): Record<string, unknown> => {
  const fr = parseInt(draft.frontRows) || 1;
  const fc = parseInt(draft.frontCols) || 1;
  const rr = parseInt(draft.rearRows) || 1;
  const rc = parseInt(draft.rearCols) || 1;

  // Use the draft's custom matrix if dimensions match, otherwise rebuild
  const frontMatrix =
    draft.frontMatrix.length === fr && (draft.frontMatrix[0]?.length ?? 0) === fc
      ? draft.frontMatrix
      : buildMatrix(fr, fc);

  const rearMatrix =
    draft.rearMatrix.length === rr && (draft.rearMatrix[0]?.length ?? 0) === rc
      ? draft.rearMatrix
      : buildMatrix(rr, rc);

  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    type: draft.type,
    u_height: parseInt(draft.u_height) || 1,
    ...(draft.storage_type ? { storage_type: draft.storage_type } : {}),
    ...(draft.role.trim() ? { role: draft.role.trim() } : {}),
    ...(draft.frontEnabled
      ? { layout: { type: 'grid', rows: fr, cols: fc, matrix: frontMatrix } }
      : {}),
    ...(draft.rearEnabled
      ? { rear_layout: { type: 'grid', rows: rr, cols: rc, matrix: rearMatrix } }
      : {}),
    rear_components: draft.rearComponents,
    checks: draft.checks,
    ...(draft.tempWarn || draft.tempCrit
      ? {
          display_thresholds: {
            temperature: {
              ...(draft.tempWarn ? { warn: parseFloat(draft.tempWarn) } : {}),
              ...(draft.tempCrit ? { crit: parseFloat(draft.tempCrit) } : {}),
            },
          },
        }
      : {}),
  };
};

const draftToPreviewTemplate = (draft: DeviceDraft, base?: DeviceTemplate): DeviceTemplate =>
  draftToTemplate(draft, base) as unknown as DeviceTemplate;

// ── TemplateItem ──────────────────────────────────────────────────────────────

const TemplateItem = ({
  template,
  selected,
  onClick,
}: {
  template: DeviceTemplate;
  selected: boolean;
  onClick: () => void;
}) => {
  const c = col(template.type);
  return (
    <button
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all',
        selected ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5',
      ].join(' ')}
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
      >
        <Server className="h-3.5 w-3.5" style={{ color: c.text }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-semibold ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
        >
          {template.name}
        </p>
        <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">
          {template.u_height}U
          {template.layout ? ` · ${template.layout.rows}×${template.layout.cols}` : ''}
        </p>
      </div>
    </button>
  );
};

// ── DevicePreview ─────────────────────────────────────────────────────────────

const DevicePreview = ({ template }: { template: DeviceTemplate }) => {
  const hasFront = !!(template.layout ?? template.disk_layout);
  const hasRear = !!template.rear_layout || (template.rear_components?.length ?? 0) > 0;
  const c = col(template.type);

  const synthDevice: Device = {
    id: 'preview',
    name: template.name,
    template_id: template.id,
    u_position: 1,
    instance: '',
    nodes: undefined,
    labels: undefined,
  };

  const synthRack: Rack = {
    id: 'preview-rack',
    name: template.name,
    u_height: template.u_height,
    devices: [synthDevice],
  };

  const synthCatalog: Record<string, DeviceTemplate> = { [template.id]: template };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--color-border)]/20 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
          >
            <Server className="h-3 w-3" style={{ color: c.text }} />
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--color-text-base)]">
            {template.name}
          </p>
          <span className="shrink-0 text-[11px] text-[var(--color-text-base)] opacity-40">
            {template.u_height}U
          </span>
        </div>
      </div>

      {!hasFront && !hasRear ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <div
            className="flex w-full max-w-xs items-center justify-center rounded-xl py-10"
            style={{ backgroundColor: c.bg, border: `2px solid ${c.border}` }}
          >
            <p className="text-sm font-bold capitalize" style={{ color: c.text }}>
              {template.type} · {template.u_height}U
            </p>
          </div>
          <p className="text-xs text-[var(--color-text-base)] opacity-30">
            No layout defined — simple component
          </p>
        </div>
      ) : (
        (() => {
          const hasBoth = hasFront && hasRear;

          // aspect-ratio = 6/uH keeps rack-mount proportions as panel resizes.
          // For storage with many slots (HD), use a slightly taller ratio
          // so the drawer rows are visible (same classic RackElevation look as before).
          const frontLayout = template.layout ?? template.disk_layout;
          const diskRows = frontLayout?.rows ?? 1;
          const slotCount = diskRows * (frontLayout?.cols ?? 1);
          const isStorageHD = template.type === 'storage' && slotCount > 20;
          // Storage HD: use rows/1.2 as aspect to give more vertical space to each drawer row
          const aspectRatio = isStorageHD
            ? Math.max(1, diskRows / 1.2) // e.g. 5 rows → ~4.2:1 → taller preview
            : 6 / template.u_height;

          const rackEl = (isRear: boolean) => (
            <RackElevation
              rack={synthRack}
              catalog={synthCatalog}
              isRearView={isRear}
              nodesData={{}}
              infraComponents={[]}
              sideComponents={[]}
              rearInfraComponents={[]}
              pduMetrics={{}}
              fullWidth
              disableZoom
              disableTooltip
            />
          );

          return (
            <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
              {/* Front */}
              <div className={hasBoth ? 'mb-3' : ''}>
                <div className="flex items-center justify-center pb-2">
                  <span className="text-brand-400/80 text-[11px] font-bold tracking-widest uppercase">
                    Front{isStorageHD ? ` — ${slotCount} slots` : ''}
                  </span>
                </div>
                <div
                  className="mx-auto w-full [&_*]:!cursor-default"
                  style={{ aspectRatio, maxWidth: 720 }}
                >
                  {rackEl(false)}
                </div>
              </div>

              {/* Rear */}
              {hasRear && (
                <div>
                  <div className="flex items-center justify-center pb-2">
                    <span className="text-[11px] font-bold tracking-widest text-amber-400/80 uppercase">
                      Rear
                    </span>
                  </div>
                  <div
                    className="mx-auto w-full [&_*]:!cursor-default"
                    style={{ aspectRatio, maxWidth: 720 }}
                  >
                    {rackEl(true)}
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
};

// ── MatrixEditor — interactive slot grid with swap and larger cells ────────────

const MatrixEditor = ({
  matrix,
  type,
  onChange,
}: {
  matrix: number[][];
  type: string;
  onChange: (m: number[][]) => void;
}) => {
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const c = col(type);
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  // Cell size: larger than before, scales with column count
  const cellSize = cols > 14 ? 28 : cols > 10 ? 32 : cols > 6 ? 38 : 46;
  const fontSize = cellSize < 32 ? 9 : cellSize < 38 ? 10 : 11;

  const handleClick = (r: number, c2: number) => {
    if (!selected) {
      setSelected([r, c2]);
      return;
    }
    const [sr, sc] = selected;
    if (sr === r && sc === c2) {
      setSelected(null);
      return;
    }
    // Swap the two cells
    const next = matrix.map((row) => [...row]);
    const tmp = next[sr][sc];
    next[sr][sc] = next[r][c2];
    next[r][c2] = tmp;
    onChange(next);
    setSelected(null);
  };

  const reset = () => {
    onChange(buildMatrix(rows, cols));
    setSelected(null);
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] text-gray-400 dark:text-gray-600">
          Click a slot, then another to swap their order.
        </p>
        <button
          onClick={reset}
          className="text-brand-500 dark:text-brand-400 text-[11px] hover:underline"
        >
          Reset order
        </button>
      </div>
      <div
        className="inline-grid gap-[3px] rounded-xl p-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          backgroundColor: 'rgba(0,0,0,0.05)',
        }}
      >
        {matrix.map((row, r) =>
          row.map((slot, c2) => {
            const isSel = selected?.[0] === r && selected?.[1] === c2;
            return (
              <button
                key={`${r}-${c2}`}
                onClick={() => handleClick(r, c2)}
                className="flex items-center justify-center rounded font-mono font-bold transition-all"
                style={{
                  width: cellSize,
                  height: cellSize,
                  fontSize,
                  backgroundColor: isSel ? c.border : c.bg,
                  border: `1.5px solid ${isSel ? c.text : c.border}`,
                  color: isSel ? '#fff' : c.text,
                  boxShadow: isSel ? `0 0 0 2px ${c.border}` : undefined,
                }}
                title={`Slot ${slot} — click to select, click another to swap`}
              >
                {slot}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ── EditorPanel ───────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5';

const EditorPanel = ({
  template,
  allChecks,
  onSaved,
  onDraftChange,
}: {
  template: DeviceTemplate;
  allChecks: CheckDefinition[];
  onSaved: () => void;
  onDraftChange?: (draft: DeviceDraft) => void;
}) => {
  const [draft, setDraft] = useState<DeviceDraft>(() => toDraft(template));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkSearch, setCheckSearch] = useState('');
  const [newRearId, setNewRearId] = useState('');
  const [newRearName, setNewRearName] = useState('');
  const [newRearType, setNewRearType] = useState<(typeof REAR_COMP_TYPES)[number]>('psu');

  useEffect(() => {
    setDraft(toDraft(template));
    setDirty(false);
    setSaveStatus('idle');
    setSaveError(null);
  }, [template]);

  const update = useCallback(
    <K extends keyof DeviceDraft>(key: K, value: DeviceDraft[K]) => {
      setDraft((d) => {
        const next = { ...d, [key]: value };
        onDraftChange?.(next);
        return next;
      });
      setDirty(true);
      setSaveStatus('idle');
    },
    [onDraftChange]
  );

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!draft.name.trim()) errs.push('Name is required.');
    const u = parseInt(draft.u_height);
    if (!u || u <= 0 || u > 100) errs.push('U height must be 1–100.');
    return errs;
  }, [draft]);

  const handleSave = async () => {
    if (validationErrors.length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateTemplate({ kind: 'device', template: draftToTemplate(draft, template) });
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

  const filteredChecks = useMemo(
    () =>
      allChecks.filter(
        (c) =>
          !draft.checks.includes(c.id) &&
          (!checkSearch ||
            (c.name ?? '').toLowerCase().includes(checkSearch.toLowerCase()) ||
            c.id.toLowerCase().includes(checkSearch.toLowerCase()))
      ),
    [allChecks, draft.checks, checkSearch]
  );

  const fr = parseInt(draft.frontRows) || 1;
  const fc = parseInt(draft.frontCols) || 1;
  const rr = parseInt(draft.rearRows) || 1;
  const rc = parseInt(draft.rearCols) || 1;

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
            {template.name}
          </p>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{template.id}</p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {dirty && (
            <button
              onClick={() => {
                const d = toDraft(template);
                setDraft(d);
                setDirty(false);
                onDraftChange?.(d);
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <X className="h-3 w-3" /> Discard
            </button>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={!dirty || !!validationErrors.length || saving}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : dirty && !validationErrors.length
                  ? 'bg-brand-500 hover:bg-brand-600 text-white'
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
        <div className="flex shrink-0 items-center gap-2 border-y border-red-200 bg-red-50 px-5 py-2 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {saveError}
        </div>
      )}

      <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
        {/* Identity */}
        <SectionCard title="Identity">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  value={draft.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="DL380 Gen10"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Template ID</label>
                <input
                  value={draft.id}
                  disabled
                  className={`${inputCls} cursor-not-allowed opacity-60`}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Type</label>
                <select
                  value={draft.type}
                  onChange={(e) => update('type', e.target.value)}
                  className={inputCls}
                >
                  {['server', 'storage', 'network', 'pdu', 'cooling', 'other'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>U Height</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.u_height}
                  onChange={(e) => update('u_height', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Role <span className="text-gray-400">(opt.)</span>
                </label>
                <input
                  value={draft.role}
                  onChange={(e) => update('role', e.target.value)}
                  placeholder="compute"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Temperature display thresholds */}
            <div>
              <label className={labelCls}>
                Temp thresholds{' '}
                <span className="text-gray-400">(°C — overrides metrics library defaults)</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] text-gray-400">Warn</label>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={draft.tempWarn}
                    onChange={(e) => update('tempWarn', e.target.value)}
                    placeholder="e.g. 38"
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] text-gray-400">Crit</label>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={draft.tempCrit}
                    onChange={(e) => update('tempCrit', e.target.value)}
                    placeholder="e.g. 45"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {draft.type === 'storage' && (
              <div>
                <label className={labelCls}>Storage type</label>
                <select
                  value={draft.storage_type}
                  onChange={(e) => update('storage_type', e.target.value)}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {STORAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {validationErrors.length > 0 &&
              validationErrors.map((msg, i) => (
                <p
                  key={i}
                  className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {msg}
                </p>
              ))}
          </div>
        </SectionCard>

        {/* Front Layout */}
        <SectionCard title="Front Layout" desc="Node / slot grid visible on the front panel">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable front layout
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Compute nodes, storage slots, network ports…
              </p>
            </div>
            <button
              type="button"
              onClick={() => update('frontEnabled', !draft.frontEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${draft.frontEnabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${draft.frontEnabled ? 'left-6' : 'left-1'}`}
              />
            </button>
          </div>
          {draft.frontEnabled && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Rows</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={draft.frontRows}
                    onChange={(e) => {
                      const r = parseInt(e.target.value) || 1;
                      update('frontRows', e.target.value);
                      update('frontMatrix', buildMatrix(r, parseInt(draft.frontCols) || 1));
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Columns</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={draft.frontCols}
                    onChange={(e) => {
                      const c = parseInt(e.target.value) || 1;
                      update('frontCols', e.target.value);
                      update('frontMatrix', buildMatrix(parseInt(draft.frontRows) || 1, c));
                    }}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
                {fr} × {fc} = {fr * fc} slots
              </p>
              <MatrixEditor
                matrix={
                  draft.frontMatrix.length === fr && (draft.frontMatrix[0]?.length ?? 0) === fc
                    ? draft.frontMatrix
                    : buildMatrix(fr, fc)
                }
                type={draft.type}
                onChange={(m) => update('frontMatrix', m)}
              />
            </div>
          )}
        </SectionCard>

        {/* Rear Layout */}
        <SectionCard
          title="Rear Layout"
          desc="Grid on the rear face (dual-sided chassis, blade enclosures…)"
        >
          <div className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable rear layout
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Rear-facing node grid</p>
            </div>
            <button
              type="button"
              onClick={() => update('rearEnabled', !draft.rearEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${draft.rearEnabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${draft.rearEnabled ? 'left-6' : 'left-1'}`}
              />
            </button>
          </div>
          {draft.rearEnabled && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Rows</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={draft.rearRows}
                    onChange={(e) => {
                      const r = parseInt(e.target.value) || 1;
                      update('rearRows', e.target.value);
                      update('rearMatrix', buildMatrix(r, parseInt(draft.rearCols) || 1));
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Columns</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={draft.rearCols}
                    onChange={(e) => {
                      const c = parseInt(e.target.value) || 1;
                      update('rearCols', e.target.value);
                      update('rearMatrix', buildMatrix(parseInt(draft.rearRows) || 1, c));
                    }}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
                {rr} × {rc} = {rr * rc} slots
              </p>
              <MatrixEditor
                matrix={
                  draft.rearMatrix.length === rr && (draft.rearMatrix[0]?.length ?? 0) === rc
                    ? draft.rearMatrix
                    : buildMatrix(rr, rc)
                }
                type={draft.type}
                onChange={(m) => update('rearMatrix', m)}
              />
            </div>
          )}
        </SectionCard>

        {/* Rear Components */}
        <SectionCard
          title="Rear Components"
          icon={Layers}
          desc="PSUs, fans, IO modules shown in the rear preview"
        >
          {draft.rearComponents.length > 0 && (
            <div className="mb-4 space-y-2">
              {draft.rearComponents.map((comp, idx) => (
                <div
                  key={comp.id || idx}
                  className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {comp.name}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">
                      {comp.id} · {comp.type}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      update(
                        'rearComponents',
                        draft.rearComponents.filter((_, i) => i !== idx)
                      )
                    }
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            <div style={{ minWidth: 80, flex: 1 }}>
              <label className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">
                ID
              </label>
              <input
                value={newRearId}
                onChange={(e) => setNewRearId(e.target.value)}
                placeholder="psu-1"
                className="focus:border-brand-500 w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div style={{ minWidth: 100, flex: 2 }}>
              <label className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">
                Name
              </label>
              <input
                value={newRearName}
                onChange={(e) => setNewRearName(e.target.value)}
                placeholder="PSU 1"
                className="focus:border-brand-500 w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div style={{ width: 85 }}>
              <label className="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">
                Type
              </label>
              <select
                value={newRearType}
                onChange={(e) => setNewRearType(e.target.value as (typeof REAR_COMP_TYPES)[number])}
                className="focus:border-brand-500 w-full rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {REAR_COMP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (!newRearId.trim() || !newRearName.trim()) return;
                update('rearComponents', [
                  ...draft.rearComponents,
                  { id: newRearId.trim(), name: newRearName.trim(), type: newRearType },
                ]);
                setNewRearId('');
                setNewRearName('');
              }}
              disabled={!newRearId.trim() || !newRearName.trim()}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </SectionCard>

        {/* Checks */}
        <SectionCard
          title="Checks"
          icon={CheckSquare}
          desc="Health checks assigned to this device type"
        >
          {draft.checks.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {draft.checks.map((id) => {
                const chk = allChecks.find((c) => c.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-400"
                  >
                    {chk?.name ?? id}
                    <button
                      onClick={() =>
                        update(
                          'checks',
                          draft.checks.filter((c) => c !== id)
                        )
                      }
                      className="rounded p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
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
              value={checkSearch}
              onChange={(e) => setCheckSearch(e.target.value)}
              placeholder="Filter checks…"
              className="focus:border-brand-500 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs placeholder-gray-400 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:placeholder-gray-600 dark:focus:bg-gray-800"
            />
            {filteredChecks.length === 0 ? (
              <p className="py-2 text-center text-xs text-gray-400 dark:text-gray-600">
                {checkSearch ? 'No matching checks.' : 'No checks available.'}
              </p>
            ) : (
              <div className="max-h-40 space-y-0.5 overflow-y-auto">
                {filteredChecks.slice(0, 20).map((chk) => (
                  <button
                    key={chk.id}
                    onClick={() => update('checks', [...draft.checks, chk.id])}
                    className="hover:bg-brand-50 dark:hover:bg-brand-500/10 flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors"
                  >
                    <Plus className="text-brand-500 h-3 w-3 shrink-0" />
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                      {chk.name ?? chk.id}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-gray-400 uppercase">
                      {chk.scope}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

// ── YamlDrawer ────────────────────────────────────────────────────────────────

const YamlDrawer = ({
  open,
  title,
  initialYaml,
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  initialYaml: string;
  onSave: (yaml: string) => Promise<void>;
  onClose: () => void;
}) => {
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
    try {
      jsYaml.load(v);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid YAML');
    }
  };

  const handleSave = async () => {
    if (parseError) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-[680px] flex-col border-l border-gray-800 bg-gray-950 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
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
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white/10 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <MonacoEditor
            height="100%"
            defaultLanguage="yaml"
            theme="vs-dark"
            value={value}
            onChange={handleChange}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
        {parseError && (
          <div className="shrink-0 border-t border-red-500/20 bg-red-500/5 px-5 py-2.5">
            <p className="font-mono text-xs text-red-400">{parseError}</p>
          </div>
        )}
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
              <button
                onClick={onClose}
                className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || !!parseError}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : null}
                {saved ? 'Saved' : 'Save YAML'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const TemplatesEditorPage = () => {
  usePageTitle('Device Templates');

  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openTypes, setOpenTypes] = useState<Set<string>>(new Set()); // collapsed by default
  const [showNewModal, setShowNewModal] = useState(false);

  // YAML drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerYaml, setDrawerYaml] = useState('');
  const drawerOnSaveRef = useRef<(yaml: string) => Promise<void>>(() => Promise.resolve());

  // Live preview
  const [previewDraft, setPreviewDraft] = useState<DeviceDraft | null>(null);

  const openYamlDrawer = (
    title: string,
    entity: unknown,
    onSave: (yaml: string) => Promise<void>
  ) => {
    // flowLevel: 3 → matrix rows serialized as inline arrays: "- [1, 2, 3]" (compact, readable)
    setDrawerTitle(title);
    setDrawerYaml(jsYaml.dump(entity, { lineWidth: 120, flowLevel: 3 }));
    drawerOnSaveRef.current = onSave;
    setDrawerOpen(true);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [catalog, checksData] = await Promise.all([api.getCatalog(), api.getChecks()]);
      setTemplates(catalog?.device_templates ?? []);
      setChecks(checksData?.checks ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);
  useEffect(() => {
    setPreviewDraft(null);
  }, [selectedId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId]
  );
  const existingIds = useMemo(() => templates.map((t) => t.id), [templates]);

  const grouped = useMemo(() => {
    const filtered = templates.filter(
      (t) =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
    );
    const map = new Map<string, DeviceTemplate[]>();
    for (const tpl of filtered) {
      const g = map.get(tpl.type) ?? [];
      g.push(tpl);
      map.set(tpl.type, g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [templates, search]);

  const previewTemplate = useMemo((): DeviceTemplate | null => {
    if (!selectedTemplate) return null;
    if (!previewDraft) return selectedTemplate;
    return draftToPreviewTemplate(previewDraft, selectedTemplate);
  }, [selectedTemplate, previewDraft]);

  return (
    <div className="flex h-full min-h-0 flex-col space-y-5">
      <PageHeader
        title="Device Templates"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Editors' },
              { label: 'Device Templates' },
            ]}
          />
        }
        actions={
          !loading && !loadError ? (
            <PageActionButton
              variant="primary"
              icon={Plus}
              onClick={() => setShowNewModal(true)}
            >
              New Template
            </PageActionButton>
          ) : undefined
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <LoadingState message="Loading device templates…" />
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
          {/* ── LEFT: list ────────────────────────────────────────────────── */}
          <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="shrink-0 p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates…"
                  className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-2 pr-3 pl-8 text-xs placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {grouped.length === 0 ? (
                <div className="px-4 py-6">
                  <EmptyState title={search ? 'No templates match.' : 'No device templates yet.'} />
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {grouped.map(([type, items]) => {
                    const isOpen = openTypes.has(type);
                    const c = col(type);
                    return (
                      <div
                        key={type}
                        className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
                      >
                        <button
                          onClick={() =>
                            setOpenTypes((prev) => {
                              const next = new Set(prev);
                              if (isOpen) {
                                next.delete(type);
                              } else {
                                next.add(type);
                              }
                              return next;
                            })
                          }
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: c.border }}
                          />
                          <span className="flex-1 text-xs font-semibold text-gray-700 capitalize dark:text-gray-300">
                            {type}
                          </span>
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            {items.length}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="space-y-0.5 border-t border-gray-100 p-1 dark:border-gray-800">
                            {items.map((tpl) => (
                              <TemplateItem
                                key={tpl.id}
                                template={tpl}
                                selected={selectedId === tpl.id}
                                onClick={() => setSelectedId(tpl.id)}
                              />
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
              <p className="text-[10px] text-gray-400 dark:text-gray-600">
                {templates.length} template{templates.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── FORM ──────────────────────────────────────────────────────── */}
          <div className="flex min-h-0 w-[560px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {selectedTemplate ? (
              <>
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                  <PageActionButton
                    variant="danger-outline"
                    icon={Trash2}
                    onClick={async () => {
                      if (
                        !confirm(
                          `Delete template "${selectedTemplate.name}"? This cannot be undone.`
                        )
                      )
                        return;
                      try {
                        await api.deleteDeviceTemplate(selectedTemplate.id);
                        setSelectedId(null);
                        await loadData();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Delete failed');
                      }
                    }}
                  >
                    Delete
                  </PageActionButton>
                  <PageActionButton
                    icon={FileCode2}
                    onClick={() =>
                      openYamlDrawer(
                        `Device Template — ${selectedTemplate.name}`,
                        selectedTemplate,
                        async (yaml) => {
                          const parsed = jsYaml.load(yaml) as Record<string, unknown>;
                          await api.updateTemplate({ kind: 'device', template: parsed });
                          await loadData();
                        }
                      )
                    }
                  >
                    Edit YAML
                  </PageActionButton>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <EditorPanel
                    key={selectedTemplate.id}
                    template={selectedTemplate}
                    allChecks={checks}
                    onDraftChange={setPreviewDraft}
                    onSaved={() => {
                      void loadData();
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                    <Server className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Select a template to edit
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── PREVIEW (front + rear stacked) ────────────────────────────── */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-rack-interior)] transition-colors duration-500">
            {previewTemplate ? (
              <DevicePreview template={previewTemplate} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-border)]/20">
                  <Server className="h-6 w-6 text-[var(--color-text-base)] opacity-30" />
                </div>
                <p className="text-sm text-[var(--color-text-base)] opacity-40">
                  Select a template to preview
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showNewModal && (
        <NewTemplateModal
          existingIds={existingIds}
          onCreated={(id) => {
            setShowNewModal(false);
            void loadData().then(() => setSelectedId(id));
          }}
          onClose={() => setShowNewModal(false)}
        />
      )}

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

// ── NewTemplateModal ──────────────────────────────────────────────────────────

const NewTemplateModal = ({
  existingIds,
  onCreated,
  onClose,
}: {
  existingIds: string[];
  onCreated: (id: string) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState({ name: '', id: '', type: 'server', uHeight: '1' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoId = slugify(form.name);
  const effectiveId = form.id.trim() || autoId;

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (existingIds.includes(effectiveId)) {
      setError('ID already exists');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createTemplate({
        kind: 'device',
        template: {
          id: effectiveId,
          name: form.name.trim(),
          type: form.type,
          u_height: parseInt(form.uHeight) || 1,
          checks: [],
          rear_components: [],
        },
      });
      onCreated(effectiveId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Device Template</h3>
        <div className="mt-5 space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="DL380 Gen10"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              ID <span className="text-gray-400">(auto-generated)</span>
            </label>
            <input
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              placeholder={autoId || 'device-id'}
              className={`${inputCls} font-mono text-xs`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className={inputCls}
              >
                {['server', 'storage', 'network', 'pdu', 'cooling', 'other'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>U Height</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.uHeight}
                onChange={(e) => setForm((f) => ({ ...f, uHeight: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleCreate()}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};
