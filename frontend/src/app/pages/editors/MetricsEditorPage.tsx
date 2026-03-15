/**
 * MetricsEditorPage — Metrics Library Editor
 *
 * Layout (mirrors ChecksEditorPage):
 *   Left  (w-80)    : list accordion by category, search
 *   Center (w-560)  : form editor — identity, PromQL, display config, thresholds
 *   Right  (flex-1) : context panel — preview, template usage
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Save,
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  FileCode2,
  Search,
  BarChart2,
  LineChart,
  Activity,
  Gauge,
  Tag,
  Server,
  Cpu,
  Thermometer,
  Zap,
  Network,
  HardDrive,
  Database,
  Info,
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import * as jsYaml from 'js-yaml';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { api } from '@src/services/api';
import type { DeviceTemplate, RackTemplate } from '@src/types';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  LoadingState,
  ErrorState,
} from '../templates/EmptyPage';
import { PageActionButton } from '@app/components/PageActionButton';

// ── Types ─────────────────────────────────────────────────────────────────────

type MetricDefinition = {
  id: string;
  name: string;
  description?: string;
  metric: string;
  labels?: Record<string, string>;
  display: {
    unit: string;
    chart_type?: string;
    color?: string;
    time_ranges?: string[];
    default_range?: string;
    aggregation?: string;
    thresholds?: { warn?: number; crit?: number };
    format?: { decimals?: number };
  };
  category?: string;
  tags?: string[];
};

type MetricDraft = {
  id: string;
  name: string;
  description: string;
  metric: string;
  unit: string;
  chart_type: string;
  color: string;
  aggregation: string;
  threshold_warn: string;
  threshold_crit: string;
  category: string;
  tags: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  power: '#f59e0b',
  temperature: '#ef4444',
  compute: '#3b82f6',
  storage: '#8b5cf6',
  network: '#10b981',
  infrastructure: '#6b7280',
  cooling: '#0891b2',
};

const CATEGORY_ICONS: Record<string, typeof BarChart2> = {
  power: Zap,
  temperature: Thermometer,
  compute: Cpu,
  storage: HardDrive,
  network: Network,
  infrastructure: Server,
  cooling: Activity,
  default: Database,
};

const CHART_TYPES = ['line', 'area', 'bar', 'gauge'];
const AGGREGATIONS = ['avg', 'max', 'min', 'sum', 'p95', 'p99'];

const categoryColor = (cat: string) => CATEGORY_COLORS[cat] ?? '#6b7280';
const CategoryIcon = ({ cat }: { cat: string }) => {
  const Icon = CATEGORY_ICONS[cat] ?? CATEGORY_ICONS.default;
  return <Icon className="h-3.5 w-3.5" />;
};

// ── Dark mode helper (same as ChartsPage) ─────────────────────────────────────

const useDark = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
};

// ── Sample data for chart preview ─────────────────────────────────────────────

const SAMPLE_DATA = [
  28, 32, 45, 41, 55, 48, 52, 58, 62, 56, 65, 70, 66, 72, 68, 75, 71, 69, 74, 78, 72, 65, 61, 58,
];
const SAMPLE_CATS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

const MetricChartPreview = ({
  chartType,
  color,
  unit,
  thresholdWarn,
  thresholdCrit,
  name,
}: {
  chartType: string;
  color: string;
  unit: string;
  thresholdWarn: string;
  thresholdCrit: string;
  name: string;
}) => {
  const dark = useDark();
  const warnNum = parseFloat(thresholdWarn);
  const critNum = parseFloat(thresholdCrit);

  // Annotations for threshold lines
  const annotations: ApexOptions['annotations'] = {
    yaxis: [
      ...(!isNaN(warnNum)
        ? [
            {
              y: warnNum,
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              strokeDashArray: 4,
              label: {
                text: `WARN ${warnNum}${unit}`,
                style: { color: '#f59e0b', background: 'transparent', fontSize: '9px' },
              },
            },
          ]
        : []),
      ...(!isNaN(critNum)
        ? [
            {
              y: critNum,
              borderColor: '#ef4444',
              borderWidth: 1.5,
              strokeDashArray: 4,
              label: {
                text: `CRIT ${critNum}${unit}`,
                style: { color: '#ef4444', background: 'transparent', fontSize: '9px' },
              },
            },
          ]
        : []),
    ],
  };

  const baseOpts: ApexOptions = {
    chart: {
      background: 'transparent',
      toolbar: { show: false },
      sparkline: { enabled: false },
      fontFamily: 'Outfit, system-ui, sans-serif',
      animations: { enabled: false },
    },
    theme: { mode: dark ? 'dark' : 'light' },
    colors: [color],
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? '#1f2937' : '#f3f4f6', strokeDashArray: 4 },
    xaxis: {
      categories: SAMPLE_CATS,
      labels: {
        show: true,
        formatter: (v: string) =>
          v.endsWith(':00') && [0, 6, 12, 18, 23].includes(parseInt(v)) ? v : '',
        style: { colors: dark ? '#6b7280' : '#9ca3af', fontSize: '10px' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: dark ? '#6b7280' : '#9ca3af', fontSize: '10px' },
        formatter: (v: number) => `${v}${unit}`,
      },
    },
    tooltip: { y: { formatter: (v: number) => `${v} ${unit}` } },
    annotations,
  };

  if (chartType === 'bar') {
    return (
      <ReactApexChart
        type="bar"
        height={160}
        options={{
          ...baseOpts,
          plotOptions: { bar: { columnWidth: '60%', borderRadius: 3 } },
          stroke: { show: false },
        }}
        series={[{ name, data: SAMPLE_DATA }]}
      />
    );
  }

  if (chartType === 'gauge') {
    const maxVal = Math.max(critNum || 100, warnNum || 80, 100);
    const currentVal = Math.round(maxVal * 0.65);
    return (
      <ReactApexChart
        type="radialBar"
        height={160}
        options={{
          chart: {
            background: 'transparent',
            toolbar: { show: false },
            fontFamily: 'Outfit, system-ui, sans-serif',
            animations: { enabled: false },
          },
          theme: { mode: dark ? 'dark' : 'light' },
          colors: [color],
          plotOptions: {
            radialBar: {
              startAngle: -90,
              endAngle: 90,
              hollow: { size: '65%' },
              dataLabels: {
                name: {
                  show: true,
                  offsetY: -10,
                  fontSize: '11px',
                  color: dark ? '#9ca3af' : '#6b7280',
                },
                value: {
                  show: true,
                  offsetY: 5,
                  fontSize: '22px',
                  fontWeight: 700,
                  formatter: (v: number | string) =>
                    `${Math.round((parseFloat(String(v)) * maxVal) / 100)}${unit}`,
                },
              },
            },
          },
          labels: [name],
        }}
        series={[Math.round((currentVal / maxVal) * 100)]}
      />
    );
  }

  // Default: line or area
  const isArea = chartType === 'area';
  return (
    <ReactApexChart
      type={isArea ? 'area' : 'line'}
      height={160}
      options={{
        ...baseOpts,
        stroke: { curve: 'smooth', width: 2 },
        fill: isArea
          ? { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } }
          : { opacity: 1 },
      }}
      series={[{ name, data: SAMPLE_DATA }]}
    />
  );
};

const metricToYaml = (m: MetricDefinition): string =>
  jsYaml.dump(m, { lineWidth: 100, quotingType: '"' });

const draftFromMetric = (m: MetricDefinition): MetricDraft => ({
  id: m.id,
  name: m.name,
  description: m.description ?? '',
  metric: m.metric,
  unit: m.display.unit,
  chart_type: m.display.chart_type ?? 'line',
  color: m.display.color ?? '#465fff',
  aggregation: m.display.aggregation ?? 'avg',
  threshold_warn: m.display.thresholds?.warn?.toString() ?? '',
  threshold_crit: m.display.thresholds?.crit?.toString() ?? '',
  category: m.category ?? '',
  tags: (m.tags ?? []).join(', '),
});

const draftToMetric = (d: MetricDraft, original?: MetricDefinition): MetricDefinition => ({
  id: d.id,
  name: d.name,
  description: d.description || undefined,
  metric: d.metric,
  labels: original?.labels ?? {},
  display: {
    unit: d.unit,
    chart_type: d.chart_type || undefined,
    color: d.color || undefined,
    time_ranges: original?.display.time_ranges ?? ['1h', '6h', '24h', '7d'],
    default_range: original?.display.default_range ?? '24h',
    aggregation: d.aggregation || undefined,
    thresholds:
      d.threshold_warn || d.threshold_crit
        ? {
            ...(d.threshold_warn ? { warn: parseFloat(d.threshold_warn) } : {}),
            ...(d.threshold_crit ? { crit: parseFloat(d.threshold_crit) } : {}),
          }
        : undefined,
    format: original?.display.format,
  },
  category: d.category || undefined,
  tags: d.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
});

// ── CSS helpers ───────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600 dark:focus:border-brand-500';
const labelCls =
  'mb-1.5 block text-[11px] font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400';

// ── EditorPanel ───────────────────────────────────────────────────────────────

const EditorPanel = ({
  metric,
  onSaved,
  onDelete,
  onDraftChange,
}: {
  metric: MetricDefinition;
  onSaved: (updated: MetricDefinition) => void;
  onDelete: () => void;
  onDraftChange: (d: MetricDraft) => void;
}) => {
  const [draft, setDraft] = useState<MetricDraft>(() => draftFromMetric(metric));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = draftFromMetric(metric);
    setDraft(d);
    onDraftChange(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric.id]);

  const update = (field: keyof MetricDraft, value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onDraftChange(next);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = draftToMetric(draft, metric);
      const yaml = metricToYaml(updated);
      const filename = `${updated.id}.yaml`;
      await api.updateMetricFile(filename, yaml);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-5 overflow-y-auto p-5">
      {/* Identity */}
      <SectionCard title="Identity">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>ID</label>
              <input
                value={draft.id}
                readOnly
                className={`${inputCls} cursor-not-allowed bg-gray-50 font-mono text-xs opacity-70 dark:bg-gray-900`}
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input
                value={draft.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="power, temperature, compute…"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Name</label>
            <input
              value={draft.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Node Temperature"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input
              value={draft.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Brief description of what this metric measures"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tags</label>
            <input
              value={draft.tags}
              onChange={(e) => update('tags', e.target.value)}
              placeholder="compute, hardware, ipmi (comma-separated)"
              className={inputCls}
            />
          </div>
        </div>
      </SectionCard>

      {/* PromQL */}
      <SectionCard
        title="Prometheus Expression"
        desc="PromQL query. Use {instance}, {rack_id}, {chassis_id} as placeholders."
      >
        <div
          className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
          style={{ height: 120 }}
        >
          <MonacoEditor
            height={120}
            defaultLanguage="promql"
            theme="vs-dark"
            value={draft.metric}
            onChange={(v) => update('metric', v ?? '')}
            options={{
              fontSize: 12,
              minimap: { enabled: false },
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: 'none',
            }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['{instance}', '{rack_id}', '{chassis_id}', '{pduid}'].map((ph) => (
            <span
              key={ph}
              title="Placeholder — replaced at query time"
              className="border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-700/30 dark:bg-brand-500/10 dark:text-brand-400 inline-flex cursor-help items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[10px]"
            >
              <Info className="h-2.5 w-2.5" />
              {ph}
            </span>
          ))}
        </div>
      </SectionCard>

      {/* Display */}
      <SectionCard title="Display Configuration">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Unit</label>
            <input
              value={draft.unit}
              onChange={(e) => update('unit', e.target.value)}
              placeholder="W, °C, %, bytes…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Chart Type</label>
            <select
              value={draft.chart_type}
              onChange={(e) => update('chart_type', e.target.value)}
              className={inputCls}
            >
              {CHART_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Aggregation</label>
            <select
              value={draft.aggregation}
              onChange={(e) => update('aggregation', e.target.value)}
              className={inputCls}
            >
              {AGGREGATIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.color}
                onChange={(e) => update('color', e.target.value)}
                className="h-9 w-10 cursor-pointer rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800"
              />
              <input
                value={draft.color}
                onChange={(e) => update('color', e.target.value)}
                placeholder="#465fff"
                className={`${inputCls} flex-1 font-mono`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Warn threshold</label>
            <input
              value={draft.threshold_warn}
              onChange={(e) => update('threshold_warn', e.target.value)}
              placeholder="e.g. 70"
              type="number"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Crit threshold</label>
            <input
              value={draft.threshold_crit}
              onChange={(e) => update('threshold_crit', e.target.value)}
              placeholder="e.g. 85"
              type="number"
              className={inputCls}
            />
          </div>
        </div>
      </SectionCard>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
        <div className="flex items-center gap-2">
          {saveError && (
            <p className="flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="h-3.5 w-3.5" /> {saveError}
            </p>
          )}
          {saved && <p className="text-xs text-green-500 dark:text-green-400">✓ Saved</p>}
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ── ContextPanel ──────────────────────────────────────────────────────────────

const ContextPanel = ({
  draft,
  metric,
  deviceTemplates,
  rackTemplates,
}: {
  draft: MetricDraft | null;
  metric: MetricDefinition | null;
  deviceTemplates: DeviceTemplate[];
  rackTemplates: RackTemplate[];
}) => {
  if (!draft || !metric) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <BarChart2 className="h-6 w-6 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">Select a metric to preview</p>
        </div>
      </div>
    );
  }

  const usedInDevices = deviceTemplates.filter((t) => (t.metrics ?? []).includes(metric.id));
  const usedInRacks = rackTemplates.filter((t) => (t.metrics ?? []).includes(metric.id));

  // ChartIcon is computed for potential use in template usage sections
  const ChartIcon =
    draft.chart_type === 'bar'
      ? BarChart2
      : draft.chart_type === 'gauge'
        ? Gauge
        : draft.chart_type === 'area'
          ? Activity
          : LineChart;
  void ChartIcon; // may be used in future chart type badges

  const warnNum = parseFloat(draft.threshold_warn);
  const critNum = parseFloat(draft.threshold_crit);
  const hasThresholds = !isNaN(warnNum) || !isNaN(critNum);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${draft.color}20`, color: draft.color }}
          >
            <CategoryIcon cat={draft.category} />
          </div>
          <p className="text-sm font-bold text-gray-800 dark:text-white">
            {draft.name || metric.name}
          </p>
          {draft.category && (
            <span
              className="ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{
                color: categoryColor(draft.category),
                borderColor: `${categoryColor(draft.category)}40`,
                backgroundColor: `${categoryColor(draft.category)}10`,
              }}
            >
              {draft.category}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {/* Chart preview */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
              Chart Preview
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: draft.color }} />
              <span className="font-mono text-[10px] text-gray-400">
                {draft.chart_type} · {draft.unit || '—'} · {draft.aggregation}
              </span>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <MetricChartPreview
              chartType={draft.chart_type}
              color={draft.color || '#465fff'}
              unit={draft.unit}
              thresholdWarn={draft.threshold_warn}
              thresholdCrit={draft.threshold_crit}
              name={draft.name || metric?.name || 'Value'}
            />
          </div>
        </div>

        {/* Thresholds */}
        {hasThresholds && (
          <div>
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
              Thresholds
            </p>
            <div className="space-y-2">
              {!isNaN(warnNum) && (
                <div className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-[10px] font-semibold text-amber-500">
                    WARN
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.min((warnNum / (critNum || warnNum * 1.3)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs text-gray-500">
                    {warnNum} {draft.unit}
                  </span>
                </div>
              )}
              {!isNaN(critNum) && (
                <div className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-[10px] font-semibold text-red-500">CRIT</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-red-400" style={{ width: '95%' }} />
                  </div>
                  <span className="shrink-0 font-mono text-xs text-gray-500">
                    {critNum} {draft.unit}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Template usage */}
        {(usedInDevices.length > 0 || usedInRacks.length > 0) && (
          <div>
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
              Used in templates
            </p>
            <div className="space-y-1.5">
              {usedInDevices.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
                >
                  <Server className="h-3 w-3 shrink-0 text-blue-400" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t.name}</span>
                  <span className="ml-auto rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-500 dark:bg-blue-500/10">
                    device
                  </span>
                </div>
              ))}
              {usedInRacks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
                >
                  <Database className="h-3 w-3 shrink-0 text-purple-400" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t.name}</span>
                  <span className="ml-auto rounded-full bg-purple-50 px-1.5 py-0.5 text-[9px] text-purple-500 dark:bg-purple-500/10">
                    rack
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {draft.tags && (
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {draft.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── YamlDrawer (same pattern as ChecksEditorPage) ─────────────────────────────

const YamlDrawer = ({
  open,
  name,
  initialContent,
  onSave,
  onClose,
}: {
  open: boolean;
  name: string;
  initialContent: string;
  onSave: (yaml: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [value, setValue] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialContent);
    setParseError(null);
    setSaveError(null);
  }, [initialContent, open]);

  const handleChange = (v: string | undefined) => {
    const val = v ?? '';
    setValue(val);
    try {
      jsYaml.load(val);
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
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
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
            <span className="text-sm font-semibold text-white">{name}</span>
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
            }}
          />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-800 px-5 py-3">
          {saveError && <span className="text-xs text-red-400">{saveError}</span>}
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5"
          >
            Close
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !!parseError}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>
    </>
  );
};

// ── MetricsEditorPage ─────────────────────────────────────────────────────────

export const MetricsEditorPage = () => {
  usePageTitle('Metrics Library');

  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [fileMap, setFileMap] = useState<Record<string, string>>({}); // metric_id → filename
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<MetricDefinition | null>(null);
  const [previewDraft, setPreviewDraft] = useState<MetricDraft | null>(null);

  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set()); // all collapsed by default

  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState('');
  const [drawerName, setDrawerName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<MetricDefinition | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [libRes, filesRes, catRes] = await Promise.all([
        api.getMetricsLibrary(),
        api.getMetricsLibraryFiles(),
        api.getCatalog(),
      ]);
      const ms: MetricDefinition[] = ((libRes as { metrics?: unknown[] }).metrics ??
        []) as MetricDefinition[];
      setMetrics(ms);
      // Build file map: id → filename (filename = id + .yaml by convention)
      const fm: Record<string, string> = {};
      for (const m of ms) fm[m.id] = `${m.id}.yaml`;
      // Override with actual files list
      for (const f of filesRes.files ?? []) {
        const name = f.name.replace(/\.ya?ml$/, '');
        fm[name] = f.name;
      }
      setFileMap(fm);
      setDeviceTemplates(catRes.device_templates ?? []);
      setRackTemplates(catRes.rack_templates ?? []);
      // Categories start collapsed — user expands on demand
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load metrics library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Grouped by category
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return metrics.filter(
      (m) =>
        !q || m.id.includes(q) || m.name.toLowerCase().includes(q) || (m.category ?? '').includes(q)
    );
  }, [metrics, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, MetricDefinition[]> = {};
    for (const m of filtered) {
      const cat = m.category ?? 'other';
      groups[cat] ||= [];
      groups[cat].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleSaved = (updated: MetricDefinition) => {
    setMetrics((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setSelected(updated);
  };

  const handleDelete = async (target?: MetricDefinition) => {
    const deleteTarget_ = target ?? deleteTarget;
    if (!deleteTarget_) return;
    setDeleting(true);
    try {
      const filename = fileMap[deleteTarget_.id] ?? `${deleteTarget_.id}.yaml`;
      await api.deleteMetricFile(filename);
      setMetrics((prev) => prev.filter((m) => m.id !== deleteTarget_.id));
      if (selected?.id === deleteTarget_.id) setSelected(null);
      setDeleteTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const openYamlDrawer = async (metric: MetricDefinition) => {
    const filename = fileMap[metric.id] ?? `${metric.id}.yaml`;
    try {
      const res = await api.getMetricFile(filename);
      setDrawerContent(res.content);
      setDrawerName(filename);
      setDrawerOpen(true);
    } catch {
      const yaml = metricToYaml(metric);
      setDrawerContent(yaml);
      setDrawerName(filename);
      setDrawerOpen(true);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-5">
      <PageHeader
        title="Metrics Library"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Editors' },
              { label: 'Metrics Library' },
            ]}
          />
        }
        actions={
          !loading && !loadError ? (
            <button
              onClick={() => alert('New metric: create a YAML file in config/metrics/library/')}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" /> New Metric
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <LoadingState message="Loading metrics library…" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <ErrorState message={loadError} onRetry={() => void loadAll()} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-5">
          {/* ── LEFT: list by category ─────────────────────────────────────── */}
          <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="shrink-0 p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search metrics…"
                  className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-2 pr-3 pl-8 text-xs placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {grouped.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">No metrics found</p>
              ) : (
                <div className="space-y-1 p-2">
                  {grouped.map(([cat, ms]) => {
                    const isOpen = openCategories.has(cat);
                    const dot = categoryColor(cat);
                    return (
                      <div
                        key={cat}
                        className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
                      >
                        <button
                          onClick={() =>
                            setOpenCategories((prev) => {
                              const next = new Set(prev);
                              if (isOpen) next.delete(cat);
                              else next.add(cat);
                              return next;
                            })
                          }
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: dot }}
                          />
                          <span className="flex-1 text-xs font-semibold text-gray-700 capitalize dark:text-gray-300">
                            {cat}
                          </span>
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                            {ms.length}
                          </span>
                          <ChevronDown
                            className={`h-3 w-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="border-t border-gray-50 dark:border-gray-800">
                            {ms.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  setSelected(m);
                                  setPreviewDraft(draftFromMetric(m));
                                }}
                                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${selected?.id === m.id ? 'bg-brand-50 dark:bg-brand-500/10' : ''}`}
                              >
                                <div
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: m.display.color ?? dot }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`truncate text-xs font-medium ${selected?.id === m.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                                  >
                                    {m.name}
                                  </p>
                                  <p className="truncate font-mono text-[9px] text-gray-400">
                                    {m.id}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                                  {m.display.unit}
                                </span>
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
              <p className="text-[10px] text-gray-400 dark:text-gray-600">
                {metrics.length} metric{metrics.length !== 1 ? 's' : ''} · {grouped.length} categor
                {grouped.length !== 1 ? 'ies' : 'y'}
              </p>
            </div>
          </div>

          {/* ── CENTER: form editor ────────────────────────────────────────── */}
          <div className="flex min-h-0 w-[560px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {selected ? (
              <>
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                  <PageActionButton
                    variant="danger-outline"
                    icon={Trash2}
                    onClick={() => void handleDelete(selected)}
                  >
                    Delete
                  </PageActionButton>
                  <PageActionButton icon={FileCode2} onClick={() => void openYamlDrawer(selected)}>
                    Edit YAML
                  </PageActionButton>
                </div>
                <div className="flex-1 overflow-hidden">
                  <EditorPanel
                    key={selected.id}
                    metric={selected}
                    onSaved={handleSaved}
                    onDelete={() => setDeleteTarget(selected)}
                    onDraftChange={setPreviewDraft}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                    <BarChart2 className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Select a metric to edit
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                    or create a new one above
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: context panel ───────────────────────────────────────── */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <ContextPanel
              draft={previewDraft}
              metric={selected}
              deviceTemplates={deviceTemplates}
              rackTemplates={rackTemplates}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Delete metric?</h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-mono font-semibold">{deleteTarget.id}</span> will be permanently
              deleted from the library.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YAML drawer */}
      <YamlDrawer
        open={drawerOpen}
        name={drawerName}
        initialContent={drawerContent}
        onSave={async (yaml) => {
          await api.updateMetricFile(drawerName, yaml);
          await loadAll();
        }}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
