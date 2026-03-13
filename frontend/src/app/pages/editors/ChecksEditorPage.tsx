/**
 * ChecksEditorPage — Checks Library Editor
 *
 * Layout: list (w-80, accordion by kind) | form (w-560) | context panel (flex)
 *
 * File strategy: checks are grouped in YAML files (ipmi.yaml, pdu.yaml, etc.)
 * The UI works at individual check level; saves back to the originating file.
 * New check: user picks an existing group or creates a new one.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Save,
  X,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  FileCode2,
  Search,
  Info,
  Tag,
  Play,
  ChevronUp,
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import jsYaml from 'js-yaml';
import { api } from '@src/services/api';
import type { CheckDefinition, DeviceTemplate, RackTemplate } from '@src/types';
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

type RuleDraft = { op: string; value: string; severity: string };

type CheckDraft = {
  id: string;
  name: string;
  kind: string;
  scope: string;
  output: string;
  expr: string;
  forDuration: string;
  rules: RuleDraft[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> =
  {
    OK: {
      bg: '#10b981',
      text: '#fff',
      border: '#10b981',
      light:
        'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30',
    },
    WARN: {
      bg: '#f59e0b',
      text: '#fff',
      border: '#f59e0b',
      light:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    },
    CRIT: {
      bg: '#ef4444',
      text: '#fff',
      border: '#ef4444',
      light:
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
    },
    UNKNOWN: {
      bg: '#6b7280',
      text: '#fff',
      border: '#6b7280',
      light:
        'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    },
  };

const KIND_COLORS: Record<string, string> = {
  core: '#2563eb',
  ipmi: '#7c3aed',
  power: '#ca8a04',
  pdu: '#d97706',
  cooling: '#0891b2',
  network: '#059669',
  storage: '#d97706',
  server: '#2563eb',
  switch: '#059669',
  other: '#374151',
};

const SCOPE_BADGES: Record<string, string> = {
  node: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  chassis:
    'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
  rack: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/30',
};

const OPS = ['==', '!=', '>', '>=', '<', '<='] as const;
const SEVERITIES = ['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const;
const SCOPES = ['node', 'chassis', 'rack'] as const;
const OUTPUTS = ['bool', 'numeric'] as const;

const EXPR_VARS = [
  { label: '$instances', desc: 'Matched node/device instances' },
  { label: '$chassis', desc: 'Chassis-level identifiers' },
  { label: '$racks', desc: 'Rack identifiers' },
  { label: '$jobs', desc: 'Prometheus job labels' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const toDraft = (c: CheckDefinition): CheckDraft => ({
  id: c.id,
  name: c.name,
  kind: c.kind ?? '',
  scope: c.scope,
  output: c.output ?? 'bool',
  expr: c.expr,
  forDuration: c.for ?? '',
  rules: (c.rules ?? []).map((r) => ({ op: r.op, value: String(r.value), severity: r.severity })),
});

const draftToCheck = (d: CheckDraft): Record<string, unknown> => ({
  id: d.id.trim(),
  name: d.name.trim(),
  ...(d.kind.trim() ? { kind: d.kind.trim() } : {}),
  scope: d.scope,
  output: d.output,
  expr: d.expr.trim(),
  for: d.forDuration.trim() || null,
  rules: d.rules.map((r) => ({
    op: r.op,
    value: isNaN(Number(r.value)) ? r.value : Number(r.value),
    severity: r.severity,
  })),
});

const kindColor = (kind: string) => KIND_COLORS[kind] ?? KIND_COLORS.other;

// ── RuleVisualizer ────────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }: { severity: string }) => {
  const s = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.UNKNOWN;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.light}`}>
      {severity}
    </span>
  );
};

const RuleVisualizer = ({ check }: { check: CheckDefinition }) => {
  const rules = check.rules ?? [];
  const isNumeric = check.output === 'numeric';
  const isBool = check.output === 'bool' || !check.output;

  // For bool: determine 0 and 1 severities from rules
  const boolStates = isBool
    ? [0, 1].map((v) => {
        const matching = rules.filter((r) => {
          if (r.op === '==' && Number(r.value) === v) return true;
          if (r.op === '!=' && Number(r.value) !== v) return true;
          return false;
        });
        return {
          value: v,
          severity: matching.length > 0 ? matching[matching.length - 1].severity : 'OK',
        };
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Rules table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
        {rules.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400">No rules defined</div>
        ) : (
          <div>
            <div className="grid grid-cols-3 border-b border-gray-100 bg-gray-50 px-3 py-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-600">
              <span>Operator</span>
              <span>Value</span>
              <span>Severity</span>
            </div>
            {rules.map((rule, i) => {
              const s = SEVERITY_COLORS[rule.severity] ?? SEVERITY_COLORS.UNKNOWN;
              return (
                <div
                  key={i}
                  className="grid grid-cols-3 items-center border-b border-gray-50 px-3 py-2.5 last:border-0 dark:border-gray-800/50"
                  style={{ borderLeft: `3px solid ${s.border}` }}
                >
                  <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                    {rule.op}
                  </span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {String(rule.value)}
                  </span>
                  <SeverityBadge severity={rule.severity} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isBool && boolStates.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
            State mapping
          </p>
          <div className="flex gap-2">
            {boolStates.map(({ value, severity }) => {
              const s = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.UNKNOWN;
              return (
                <div
                  key={value}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-colors"
                  style={{ borderColor: s.border, backgroundColor: `${s.border}15` }}
                >
                  <span className="font-mono text-lg font-black" style={{ color: s.border }}>
                    {value}
                  </span>
                  <SeverityBadge severity={severity} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isNumeric && rules.some((r) => ['>', '>=', '<', '<='].includes(r.op)) && (
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
            Threshold overview
          </p>
          <div className="space-y-1.5">
            {[...rules]
              .sort((a, b) => Number(a.value) - Number(b.value))
              .map((r, i) => {
                const s = SEVERITY_COLORS[r.severity] ?? SEVERITY_COLORS.UNKNOWN;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: s.border }}
                    />
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                      {r.op} {r.value}
                    </span>
                    <span className="text-gray-400">→</span>
                    <SeverityBadge severity={r.severity} />
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── UsagePanel ────────────────────────────────────────────────────────────────

const UsagePanel = ({
  checkId,
  deviceTemplates,
  rackTemplates,
}: {
  checkId: string;
  deviceTemplates: DeviceTemplate[];
  rackTemplates: RackTemplate[];
}) => {
  const devices = deviceTemplates.filter((t) => t.checks?.includes(checkId));
  const racks = rackTemplates.filter((t) => t.checks?.includes(checkId));
  const total = devices.length + racks.length;

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
        Used by {total > 0 ? `(${total})` : ''}
      </p>
      {total === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-600">Not referenced by any template</p>
      ) : (
        <div className="space-y-1">
          {devices.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <Tag className="h-3 w-3 shrink-0 text-blue-400" />
              <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{t.name}</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                device
              </span>
            </div>
          ))}
          {racks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <Tag className="h-3 w-3 shrink-0 text-teal-400" />
              <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{t.name}</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                rack
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── EditorPanel ───────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5';

// ── Severity evaluation helpers ───────────────────────────────────────────────

const SEVERITY_ORDER = ['OK', 'UNKNOWN', 'WARN', 'CRIT'];

const evalSeverity = (value: number, rules: RuleDraft[]): string => {
  let worst = 'OK';
  for (const rule of rules) {
    const v = Number(rule.value);
    let matches = false;
    if (rule.op === '==' && value === v) matches = true;
    if (rule.op === '!=' && value !== v) matches = true;
    if (rule.op === '>' && value > v) matches = true;
    if (rule.op === '>=' && value >= v) matches = true;
    if (rule.op === '<' && value < v) matches = true;
    if (rule.op === '<=' && value <= v) matches = true;
    if (matches && SEVERITY_ORDER.indexOf(rule.severity) > SEVERITY_ORDER.indexOf(worst)) {
      worst = rule.severity;
    }
  }
  return worst;
};

// ── TestQueryPanel ────────────────────────────────────────────────────────────

/** Detect $variable placeholders in a PromQL expression */
const detectVars = (expr: string): string[] => {
  const matches = expr.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
};

const TestQueryPanel = ({ expr, rules }: { expr: string; rules: RuleDraft[] }) => {
  const vars = useMemo(() => detectVars(expr), [expr]);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<null | {
    expr: string;
    rows: Array<{ labels: Record<string, string>; value: number; severity: string }>;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const substituted = useMemo(() => {
    let e = expr;
    for (const [k, v] of Object.entries(varValues)) {
      e = e.replace(new RegExp(`\\$${k}`, 'g'), v || `$${k}`);
    }
    return e;
  }, [expr, varValues]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.testCheckQuery(expr, varValues);
      const series = res.prometheus?.data?.result ?? [];
      const rows = series.map((s) => {
        const value = parseFloat(s.value[1]);
        return {
          labels: s.metric,
          value,
          severity: evalSeverity(value, rules),
        };
      });
      setResult({ expr: res.expr, rows });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Query failed');
    } finally {
      setRunning(false);
    }
  };

  const severitySummary = result
    ? Object.entries(
        result.rows.reduce(
          (acc, r) => {
            acc[r.severity] = (acc[r.severity] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      ).sort(([a], [b]) => SEVERITY_ORDER.indexOf(b) - SEVERITY_ORDER.indexOf(a))
    : [];

  return (
    <div className="border-brand-200 bg-brand-50/50 dark:border-brand-700/30 dark:bg-brand-500/5 mt-4 overflow-hidden rounded-xl border">
      {vars.length > 0 && (
        <div className="border-brand-200/60 dark:border-brand-700/20 border-b px-4 py-3">
          <p className="text-brand-600/70 dark:text-brand-400/70 mb-2.5 text-[10px] font-semibold tracking-wider uppercase">
            Variables
          </p>
          <div className="flex flex-wrap gap-2">
            {vars.map((v) => (
              <div key={v} className="flex items-center gap-1.5">
                <span className="text-brand-600 dark:text-brand-400 shrink-0 font-mono text-[11px] font-semibold">
                  ${v}
                </span>
                <input
                  value={varValues[v] ?? ''}
                  onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
                  placeholder={`e.g. ${v === 'instances' ? 'compute001' : v === 'jobs' ? 'node' : v === 'racks' ? 'rack-01' : '.*'}`}
                  className="focus:border-brand-500 border-brand-200 dark:border-brand-700/40 w-40 rounded-lg border bg-white px-2.5 py-1.5 font-mono text-xs placeholder-gray-400 focus:outline-none dark:bg-gray-900 dark:text-gray-200 dark:placeholder-gray-600"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-brand-600/70 dark:text-brand-400/70 mb-1 text-[10px] font-semibold tracking-wider uppercase">
            Query
          </p>
          <p className="font-mono text-[11px] break-all text-gray-700 dark:text-gray-300">
            {substituted}
          </p>
        </div>
        <button
          onClick={() => void handleRun()}
          disabled={running}
          className="bg-brand-500 hover:bg-brand-600 flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {running ? 'Running…' : 'Run'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="font-mono">{error}</span>
        </div>
      )}

      {result && (
        <div className="border-brand-200/60 dark:border-brand-700/20 border-t">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {result.rows.length} series
            </span>
            {severitySummary.map(([sev, count]) => {
              const s = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS.UNKNOWN;
              return (
                <span
                  key={sev}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.light}`}
                >
                  {count} {sev}
                </span>
              );
            })}
          </div>

          {result.rows.length === 0 ? (
            <p className="px-4 pb-3 text-xs text-gray-400 dark:text-gray-600">No data returned</p>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {result.rows.map((row, i) => {
                const s = SEVERITY_COLORS[row.severity] ?? SEVERITY_COLORS.UNKNOWN;
                // Show the most relevant label (instance, job, rack_id, etc.)
                const mainLabel =
                  row.labels.instance ??
                  row.labels.rack_id ??
                  row.labels.job ??
                  Object.values(row.labels)[0] ??
                  '—';
                const extraLabels = Object.entries(row.labels).filter(([k]) =>
                  k !== '__name__' && row.labels.instance ? k !== 'instance' : true
                );
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-t border-gray-100 px-4 py-2 dark:border-gray-800"
                    style={{ borderLeft: `3px solid ${s.border}` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {mainLabel}
                      </p>
                      {extraLabels.length > 1 && (
                        <p className="truncate font-mono text-[10px] text-gray-400 dark:text-gray-600">
                          {extraLabels
                            .slice(0, 3)
                            .map(([k, v]) => `${k}="${v}"`)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                      {row.value}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.light}`}
                    >
                      {row.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EditorPanel = ({
  check,
  onSaved,
  onDelete,
  onDraftChange,
}: {
  check: CheckDefinition;
  onSaved: (draft: CheckDraft) => Promise<void>;
  onDelete: () => void;
  onDraftChange?: (d: CheckDraft) => void;
}) => {
  const [draft, setDraft] = useState<CheckDraft>(() => toDraft(check));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(check));
    setDirty(false);
    setSaveStatus('idle');
    setSaveError(null);
  }, [check]);

  const update = useCallback(
    <K extends keyof CheckDraft>(key: K, value: CheckDraft[K]) => {
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

  const [showTest, setShowTest] = useState(false);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!draft.name.trim()) errs.push('Name is required.');
    if (!draft.id.trim()) errs.push('ID is required.');
    if (!draft.expr.trim()) errs.push('PromQL expression is required.');
    if (draft.rules.length === 0) errs.push('At least one rule is required.');
    return errs;
  }, [draft]);

  const handleSave = async () => {
    if (validationErrors.length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSaved(draft);
      setSaveStatus('saved');
      setDirty(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const addRule = () =>
    update('rules', [...draft.rules, { op: '==', value: '0', severity: 'CRIT' }]);

  const updateRule = (i: number, key: keyof RuleDraft, val: string) => {
    const next = [...draft.rules];
    next[i] = { ...next[i], [key]: val };
    update('rules', next);
  };

  const removeRule = (i: number) =>
    update(
      'rules',
      draft.rules.filter((_, idx) => idx !== i)
    );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{check.name}</p>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{check.id}</p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          {dirty && (
            <button
              onClick={() => {
                const d = toDraft(check);
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
                  placeholder="Node up"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Check ID</label>
                <input
                  value={draft.id}
                  disabled
                  className={`${inputCls} cursor-not-allowed opacity-60`}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Kind</label>
                <input
                  value={draft.kind}
                  onChange={(e) => update('kind', e.target.value)}
                  placeholder="ipmi, pdu, core…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Scope</label>
                <select
                  value={draft.scope}
                  onChange={(e) => update('scope', e.target.value)}
                  className={inputCls}
                >
                  {SCOPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Output</label>
                <select
                  value={draft.output}
                  onChange={(e) => update('output', e.target.value)}
                  className={inputCls}
                >
                  {OUTPUTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>
                For duration
                <span className="ml-2 text-[10px] font-normal text-gray-400 dark:text-gray-600">
                  debounce before firing (30s · 1m · 5m · 10m · 1h) — leave empty for immediate
                </span>
              </label>
              <input
                value={draft.forDuration}
                onChange={(e) => update('forDuration', e.target.value)}
                placeholder="null (immediate)"
                className={inputCls}
              />
            </div>
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

        {/* PromQL expression */}
        <SectionCard title="PromQL Expression">
          <div
            className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
            style={{ height: 140 }}
          >
            <MonacoEditor
              height={140}
              defaultLanguage="promql"
              theme="vs-dark"
              value={draft.expr}
              onChange={(v) => update('expr', v ?? '')}
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
          {/* Variable reference + Test button */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {EXPR_VARS.map(({ label, desc }) => (
                <span
                  key={label}
                  title={desc}
                  className="border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-700/30 dark:bg-brand-500/10 dark:text-brand-400 inline-flex cursor-help items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[10px]"
                >
                  <Info className="h-2.5 w-2.5" />
                  {label}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowTest((v) => !v)}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                showTest
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20',
              ].join(' ')}
            >
              {showTest ? <ChevronUp className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              Test query
            </button>
          </div>

          {/* Test panel */}
          {showTest && <TestQueryPanel expr={draft.expr} rules={draft.rules} />}
        </SectionCard>

        {/* Threshold rules */}
        <SectionCard title="Threshold Rules" desc="Define when the check triggers WARN/CRIT/OK">
          <div className="space-y-2">
            {draft.rules.map((rule, i) => {
              const s = SEVERITY_COLORS[rule.severity] ?? SEVERITY_COLORS.UNKNOWN;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/40"
                  style={{ borderLeft: `3px solid ${s.border}` }}
                >
                  <select
                    value={rule.op}
                    onChange={(e) => updateRule(i, 'op', e.target.value)}
                    className="focus:border-brand-500 w-16 rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-mono text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    {OPS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <input
                    value={rule.value}
                    onChange={(e) => updateRule(i, 'value', e.target.value)}
                    placeholder="0"
                    className="focus:border-brand-500 w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-mono text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                  <span className="text-xs text-gray-400">→</span>
                  <select
                    value={rule.severity}
                    onChange={(e) => updateRule(i, 'severity', e.target.value)}
                    className="focus:border-brand-500 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    {SEVERITIES.map((sv) => (
                      <option key={sv} value={sv}>
                        {sv}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeRule(i)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              onClick={addRule}
              className="hover:border-brand-300 hover:text-brand-500 dark:hover:border-brand-600 dark:hover:text-brand-400 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 py-2 text-xs font-medium text-gray-400 transition-colors dark:border-gray-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add rule
            </button>
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

  const handleChange = (v: string | undefined) => {
    setValue(v ?? '');
    try {
      jsYaml.load(v ?? '');
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

// ── NewCheckModal ─────────────────────────────────────────────────────────────

const NewCheckModal = ({
  fileList,
  existingIds,
  onCreated,
  onClose,
}: {
  fileList: string[];
  existingIds: string[];
  onCreated: (draft: CheckDraft, targetFile: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [form, setForm] = useState({
    name: '',
    id: '',
    kind: '',
    scope: 'node',
    output: 'bool',
    expr: '',
    group: fileList[0] ?? '',
    newGroup: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoId = form.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const effectiveId = form.id.trim() || autoId;
  const useNewGroup = form.group === '__new__';
  const targetFile = useNewGroup
    ? `${form.newGroup.trim().replace(/[^a-z0-9-_]/g, '')}.yaml`
    : form.group;

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!effectiveId) {
      setError('ID is required');
      return;
    }
    if (existingIds.includes(effectiveId)) {
      setError('ID already exists');
      return;
    }
    if (useNewGroup && !form.newGroup.trim()) {
      setError('Group name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreated(
        {
          id: effectiveId,
          name: form.name.trim(),
          kind: form.kind || form.group.replace('.yaml', ''),
          scope: form.scope,
          output: form.output,
          expr: form.expr.trim(),
          forDuration: '',
          rules: [{ op: '==', value: '0', severity: 'CRIT' }],
        },
        targetFile
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Check</h3>
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Node up"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                ID <span className="text-gray-400">(auto)</span>
              </label>
              <input
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder={autoId || 'check_id'}
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                className={inputCls}
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Output</label>
              <select
                value={form.output}
                onChange={(e) => setForm((f) => ({ ...f, output: e.target.value }))}
                className={inputCls}
              >
                {OUTPUTS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Kind <span className="text-gray-400">(opt.)</span>
              </label>
              <input
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                placeholder="ipmi, core…"
                className={inputCls}
              />
            </div>
          </div>
          {/* Group selection */}
          <div>
            <label className={labelCls}>Group (file)</label>
            <select
              value={form.group}
              onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
              className={inputCls}
            >
              {fileList.map((f) => (
                <option key={f} value={f}>
                  {f.replace('.yaml', '')}
                </option>
              ))}
              <option value="__new__">+ New group…</option>
            </select>
          </div>
          {useNewGroup && (
            <div>
              <label className={labelCls}>New group name</label>
              <input
                value={form.newGroup}
                onChange={(e) => setForm((f) => ({ ...f, newGroup: e.target.value }))}
                placeholder="my-checks"
                className={`${inputCls} font-mono text-xs`}
              />
              {form.newGroup && (
                <p className="mt-1 text-[10px] text-gray-400">
                  Will create:{' '}
                  <span className="font-mono">
                    {form.newGroup.replace(/[^a-z0-9-_]/g, '')}.yaml
                  </span>
                </p>
              )}
            </div>
          )}
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

// ── DeleteConfirmModal ────────────────────────────────────────────────────────

const DeleteConfirmModal = ({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
        <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete check?</h3>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        You are about to permanently delete{' '}
        <span className="font-semibold text-gray-700 dark:text-gray-300">{name}</span>. This will
        remove it from its YAML file and all templates that reference it will lose this check.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

export const ChecksEditorPage = () => {
  usePageTitle('Checks Library');

  const [allChecks, setAllChecks] = useState<CheckDefinition[]>([]);
  const [fileList, setFileList] = useState<string[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [fileManifest, setFileManifest] = useState<Record<string, string>>({}); // checkId → fileName
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openKinds, setOpenKinds] = useState<Set<string>>(new Set());
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CheckDefinition | null>(null);

  // YAML drawer (for whole-file editing)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFile, setDrawerFile] = useState('');
  const drawerOnSaveRef = useRef<(yaml: string) => Promise<void>>(() => Promise.resolve());

  // Live context panel
  const [previewDraft, setPreviewDraft] = useState<CheckDraft | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [library, filesData, catalog] = await Promise.all([
        api.getChecks(),
        api.getChecksFiles(),
        api.getCatalog(),
      ]);

      const names: string[] = (filesData.files ?? []).map((f: { name: string }) => f.name);

      // Load all file contents in parallel
      const fileResults = await Promise.all(names.map((n) => api.getChecksFile(n)));
      const contents: Record<string, string> = {};
      const manifest: Record<string, string> = {};

      fileResults.forEach((data: { name: string; content: string }, i) => {
        const name = names[i];
        contents[name] = data.content;
        try {
          const parsed = jsYaml.load(data.content) as Record<string, unknown>;
          const checks = (parsed?.checks as Array<{ id: string }>) ?? [];
          checks.forEach((c) => {
            if (c.id) manifest[c.id] = name;
          });
        } catch {
          /* ignore parse errors */
        }
      });

      setFileList(names);
      setFileContents(contents);
      setFileManifest(manifest);
      setAllChecks(library?.checks ?? []);
      setDeviceTemplates(catalog?.device_templates ?? []);
      setRackTemplates(catalog?.rack_templates ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load checks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);
  useEffect(() => {
    setPreviewDraft(null);
  }, [selectedId]);

  const selectedCheck = useMemo(
    () => allChecks.find((c) => c.id === selectedId) ?? null,
    [allChecks, selectedId]
  );

  // Grouped filtered list
  const grouped = useMemo(() => {
    const filtered = allChecks.filter(
      (c) =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase())
    );
    const map = new Map<string, CheckDefinition[]>();
    for (const check of filtered) {
      const kind = check.kind ?? fileManifest[check.id]?.replace('.yaml', '') ?? 'other';
      const g = map.get(kind) ?? [];
      g.push(check);
      map.set(kind, g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allChecks, search, fileManifest]);

  // Save an edited check back to its file
  const handleSaveCheck = async (draft: CheckDraft) => {
    const fileName = fileManifest[draft.id];
    if (!fileName) throw new Error('Cannot find file for this check');
    const content = fileContents[fileName] ?? '';
    let parsed: Record<string, unknown>;
    try {
      parsed = (jsYaml.load(content) as Record<string, unknown>) ?? { checks: [] };
    } catch {
      parsed = { checks: [] };
    }
    const checks = (parsed.checks as Array<Record<string, unknown>>) ?? [];
    parsed.checks = checks.map((c) => (c.id === draft.id ? draftToCheck(draft) : c));
    const newContent = jsYaml.dump(parsed, { lineWidth: 120 });
    await api.updateChecksFile(fileName, newContent);
    await loadAll();
  };

  // Create a new check in an existing or new file
  const handleCreateCheck = async (draft: CheckDraft, targetFile: string) => {
    const content = fileContents[targetFile] ?? '';
    let parsed: Record<string, unknown>;
    try {
      parsed = (jsYaml.load(content) as Record<string, unknown>) ?? { checks: [] };
    } catch {
      parsed = { checks: [] };
    }
    parsed.checks ||= [];
    (parsed.checks as Array<unknown>).push(draftToCheck(draft));
    const newContent = jsYaml.dump(parsed, { lineWidth: 120 });
    await api.updateChecksFile(targetFile, newContent);
    await loadAll();
    setSelectedId(draft.id);
  };

  // Delete a check from its file
  const handleDeleteCheck = async (checkId: string) => {
    const fileName = fileManifest[checkId];
    if (!fileName) return;
    const content = fileContents[fileName] ?? '';
    let parsed: Record<string, unknown>;
    try {
      parsed = (jsYaml.load(content) as Record<string, unknown>) ?? { checks: [] };
    } catch {
      parsed = { checks: [] };
    }
    const checks = (parsed.checks as Array<Record<string, unknown>>) ?? [];
    parsed.checks = checks.filter((c) => c.id !== checkId);
    const newContent = jsYaml.dump(parsed, { lineWidth: 120 });
    await api.updateChecksFile(fileName, newContent);
    setSelectedId(null);
    setDeleteTarget(null);
    await loadAll();
  };

  // Preview check (live from draft or saved)
  const previewCheck = useMemo((): CheckDefinition | null => {
    if (!selectedCheck) return null;
    if (!previewDraft) return selectedCheck;
    return {
      ...selectedCheck,
      ...draftToCheck(previewDraft),
      rules: previewDraft.rules.map((r) => ({
        op: r.op as '==' | '!=' | '>' | '>=' | '<' | '<=',
        value: isNaN(Number(r.value)) ? r.value : Number(r.value),
        severity: r.severity as 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN',
      })),
    };
  }, [selectedCheck, previewDraft]);

  return (
    <div className="flex h-full min-h-0 flex-col space-y-5">
      <PageHeader
        title="Checks Library"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Editors' },
              { label: 'Checks Library' },
            ]}
          />
        }
        actions={
          !loading && !loadError ? (
            <PageActionButton variant="primary" icon={Plus} onClick={() => setShowNewModal(true)}>
              New Check
            </PageActionButton>
          ) : undefined
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <LoadingState message="Loading checks library…" />
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <ErrorState
            message={loadError}
            onRetry={() => {
              void loadAll();
            }}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-5">
          {/* ── LEFT: list accordion by kind ──────────────────────────────── */}
          <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="shrink-0 p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search checks…"
                  className="focus:border-brand-500 w-full rounded-xl border border-gray-200 py-2 pr-3 pl-8 text-xs placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {grouped.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-400">No checks found</p>
              ) : (
                <div className="space-y-1 p-2">
                  {grouped.map(([kind, checks]) => {
                    const isOpen = openKinds.has(kind);
                    const dot = kindColor(kind);
                    return (
                      <div
                        key={kind}
                        className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
                      >
                        <button
                          onClick={() =>
                            setOpenKinds((prev) => {
                              const next = new Set(prev);
                              if (isOpen) {
                                next.delete(kind);
                              } else {
                                next.add(kind);
                              }
                              return next;
                            })
                          }
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: dot }}
                          />
                          <span className="flex-1 text-xs font-semibold text-gray-700 capitalize dark:text-gray-300">
                            {kind}
                          </span>
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            {checks.length}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="space-y-0.5 border-t border-gray-100 p-1 dark:border-gray-800">
                            {checks.map((check) => {
                              const selected = selectedId === check.id;
                              return (
                                <button
                                  key={check.id}
                                  onClick={() => setSelectedId(check.id)}
                                  className={[
                                    'flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition-all',
                                    selected
                                      ? 'bg-brand-50 dark:bg-brand-500/10'
                                      : 'hover:bg-gray-50 dark:hover:bg-white/5',
                                  ].join(' ')}
                                >
                                  <span
                                    className={`text-xs font-semibold ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                                  >
                                    {check.name}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] text-gray-400 dark:text-gray-600">
                                      {check.id}
                                    </span>
                                    <span
                                      className={`rounded-full border px-1.5 py-0 text-[9px] font-semibold ${SCOPE_BADGES[check.scope] ?? SCOPE_BADGES.node}`}
                                    >
                                      {check.scope}
                                    </span>
                                    {check.output && (
                                      <span className="rounded-full bg-gray-100 px-1.5 py-0 font-mono text-[9px] text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                                        {check.output}
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
              )}
            </div>

            <div className="shrink-0 border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
              <p className="text-[10px] text-gray-400 dark:text-gray-600">
                {allChecks.length} check{allChecks.length !== 1 ? 's' : ''} · {fileList.length} file
                {fileList.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── FORM ──────────────────────────────────────────────────────── */}
          <div className="flex min-h-0 w-[560px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {selectedCheck ? (
              <>
                {/* Center panel header */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                  <PageActionButton
                    variant="danger-outline"
                    icon={Trash2}
                    onClick={() => setDeleteTarget(selectedCheck)}
                  >
                    Delete
                  </PageActionButton>
                  <PageActionButton
                    icon={FileCode2}
                    onClick={() => {
                      const fn = fileManifest[selectedCheck.id];
                      if (!fn) return;
                      setDrawerFile(fn);
                      drawerOnSaveRef.current = async (yaml) => {
                        await api.updateChecksFile(fn, yaml);
                        await loadAll();
                      };
                      setDrawerOpen(true);
                    }}
                  >
                    Edit YAML
                  </PageActionButton>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <EditorPanel
                    key={selectedCheck.id}
                    check={selectedCheck}
                    onSaved={handleSaveCheck}
                    onDelete={() => setDeleteTarget(selectedCheck)}
                    onDraftChange={setPreviewDraft}
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                    <CheckCircle2 className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Select a check to edit
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                    or create a new one above
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── CONTEXT PANEL: rules + usage ──────────────────────────────── */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            {previewCheck ? (
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="shrink-0 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: kindColor(previewCheck.kind ?? '') }}
                    />
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      {previewCheck.name}
                    </p>
                    <span
                      className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SCOPE_BADGES[previewCheck.scope] ?? SCOPE_BADGES.node}`}
                    >
                      {previewCheck.scope}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-5">
                  {/* Rules visualization */}
                  <div>
                    <p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                      Rules
                    </p>
                    <RuleVisualizer check={previewCheck} />
                  </div>

                  {/* Usage cross-reference */}
                  <div>
                    <UsagePanel
                      checkId={previewCheck.id}
                      deviceTemplates={deviceTemplates}
                      rackTemplates={rackTemplates}
                    />
                  </div>

                  {/* File location */}
                  {fileManifest[previewCheck.id] && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                        File
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <FileCode2 className="h-3 w-3" />
                        {fileManifest[previewCheck.id]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <Info className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-600">
                    Select a check to see its rules and usage
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showNewModal && (
        <NewCheckModal
          fileList={fileList}
          existingIds={allChecks.map((c) => c.id)}
          onCreated={handleCreateCheck}
          onClose={() => setShowNewModal(false)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onConfirm={() => void handleDeleteCheck(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* YAML file drawer */}
      <YamlDrawer
        open={drawerOpen}
        title={drawerFile}
        initialYaml={fileContents[drawerFile] ?? ''}
        onSave={drawerOnSaveRef.current}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
