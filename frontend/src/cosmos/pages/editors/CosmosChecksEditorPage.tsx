import { useState, useEffect, useMemo, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import yaml from 'js-yaml';
import { Pencil, Trash2, Plus, X, Check, ChevronRight, ShieldCheck } from 'lucide-react';
import { api } from '../../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckRule = {
  op: string;
  value: number | string;
  severity: 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';
};

type CheckDef = {
  id: string;
  name?: string;
  scope?: string;
  kind?: string;
  expr?: string;
  output?: 'bool' | 'numeric';
  rules?: CheckRule[];
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ---------------------------------------------------------------------------
// ScopeBadge
// ---------------------------------------------------------------------------

const SCOPE_COLORS: Record<string, string> = {
  node: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  chassis: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
  rack: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
};

const ScopeBadge = ({ scope }: { scope?: string }) => {
  const cls = SCOPE_COLORS[scope ?? ''] ?? 'border-gray-700 bg-gray-800 text-gray-400';
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${cls}`}>
      {scope ?? 'unknown'}
    </span>
  );
};

// ---------------------------------------------------------------------------
// KindBadge
// ---------------------------------------------------------------------------

const KIND_COLORS: Record<string, string> = {
  server: 'border-green-500/30 bg-green-500/10 text-green-400',
  storage: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  pdu: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  ipmi: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  switch: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  cooling: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
};

const KindBadge = ({ kind }: { kind?: string }) => {
  if (!kind) return null;
  const cls = KIND_COLORS[kind] ?? 'border-gray-700 bg-gray-800 text-gray-400';
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${cls}`}>
      {kind}
    </span>
  );
};

// ---------------------------------------------------------------------------
// RuleBadge
// ---------------------------------------------------------------------------

const SEV_COLORS: Record<string, string> = {
  OK: 'bg-green-500',
  WARN: 'bg-amber-500',
  CRIT: 'bg-red-500',
  UNKNOWN: 'bg-gray-500',
};

const RuleBadge = ({ rule }: { rule: CheckRule }) => (
  <div className="flex items-center gap-2 text-[11px] text-gray-400">
    <span className="font-mono">
      {rule.op} {String(rule.value)}
    </span>
    <span className="text-gray-600">→</span>
    <span
      className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold text-white ${SEV_COLORS[rule.severity] ?? 'bg-gray-500'}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
      {rule.severity}
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// CheckCard
// ---------------------------------------------------------------------------

type CheckCardProps = {
  check: CheckDef;
  onEdit: () => void;
  onDelete: () => void;
};

const CheckCard = ({ check, onEdit, onDelete }: CheckCardProps) => (
  <div className="group flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
    {/* Header */}
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <ScopeBadge scope={check.scope} />
          <KindBadge kind={check.kind} />
          {check.output && (
            <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-gray-500 uppercase">
              {check.output}
            </span>
          )}
        </div>
        {/* Edit / Delete buttons */}
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            title="Edit check"
            className="hover:border-brand-500/40 hover:text-brand-500 rounded-lg border border-gray-700 p-1.5 text-gray-500"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete check"
            className="rounded-lg border border-gray-700 p-1.5 text-gray-500 hover:border-red-500/40 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <h3 className="font-mono text-sm font-bold text-white">{check.id}</h3>
      {check.name && check.name !== check.id && (
        <p className="text-[11px] text-gray-500">{check.name}</p>
      )}
    </div>

    {/* PromQL expression */}
    {check.expr && (
      <div className="rounded-xl border border-white/5 bg-black/40 px-3 py-2">
        <div className="mb-1 font-mono text-[9px] tracking-[0.2em] text-gray-600 uppercase">
          expr
        </div>
        <p className="font-mono text-[11px] leading-relaxed break-all text-gray-300">
          {check.expr}
        </p>
      </div>
    )}

    {/* Rules */}
    {check.rules && check.rules.length > 0 && (
      <div className="space-y-1.5">
        <div className="font-mono text-[9px] tracking-[0.2em] text-gray-600 uppercase">Rules</div>
        <div className="space-y-1">
          {check.rules.map((rule, i) => (
            <RuleBadge key={i} rule={rule} />
          ))}
        </div>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// CheckWizard — add / edit a check (Cosmos TailAdmin style)
// ---------------------------------------------------------------------------

type CheckFormData = {
  id: string;
  name: string;
  scope: string;
  kind: string;
  expr: string;
  output: 'bool' | 'numeric';
  rules: CheckRule[];
};

const EMPTY_FORM: CheckFormData = {
  id: '',
  name: '',
  scope: 'node',
  kind: '',
  expr: '',
  output: 'bool',
  rules: [],
};

type CheckFormProps = {
  initial: CheckFormData;
  isEdit: boolean;
  onSave: (data: CheckFormData) => void;
  onCancel: () => void;
};

type WizardStep = 'identity' | 'expression' | 'rules' | 'review';
const WIZARD_STEPS: WizardStep[] = ['identity', 'expression', 'rules', 'review'];
const STEP_LABELS: Record<WizardStep, string> = {
  identity: 'Identity',
  expression: 'Expression',
  rules: 'Rules',
  review: 'Review',
};

const SEV_PILL: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const SCOPE_OPTIONS = [
  { value: 'node', label: 'Node', desc: 'Per instance (server, blade...)' },
  { value: 'chassis', label: 'Chassis', desc: 'Multi-node chassis' },
  { value: 'rack', label: 'Rack', desc: 'Rack-level aggregation' },
];

const KIND_OPTIONS = ['server', 'storage', 'network', 'pdu', 'cooling', 'ipmi', 'other'];

const cosmosInput =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:placeholder:text-gray-600';

const CheckForm = ({ initial, isEdit, onSave, onCancel }: CheckFormProps) => {
  const [step, setStep] = useState<WizardStep>(isEdit ? 'identity' : 'identity');
  const [form, setForm] = useState<CheckFormData>(initial);

  const stepIdx = WIZARD_STEPS.indexOf(step);

  const canNext =
    step === 'identity'
      ? Boolean(form.id.trim()) && Boolean(form.scope)
      : step === 'expression'
        ? Boolean(form.expr.trim())
        : true;

  const addRule = () =>
    setForm((f) => ({
      ...f,
      rules: [...f.rules, { op: '==', value: 0, severity: 'CRIT' as const }],
    }));

  const updateRule = (i: number, patch: Partial<CheckRule>) =>
    setForm((f) => {
      const rules = [...f.rules];
      rules[i] = { ...rules[i], ...patch };
      return { ...f, rules };
    });

  const removeRule = (i: number) =>
    setForm((f) => ({ ...f, rules: f.rules.filter((_, j) => j !== i) }));

  const handleNext = () => {
    if (stepIdx < WIZARD_STEPS.length - 1) setStep(WIZARD_STEPS[stepIdx + 1]);
  };
  const handleBack = () => {
    if (stepIdx > 0) setStep(WIZARD_STEPS[stepIdx - 1]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {isEdit ? `Edit: ${form.id}` : 'New Check'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {isEdit ? 'Modify the check definition' : 'Add a health check to this file'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 border-b border-gray-100 px-6 py-3 dark:border-gray-800">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                  i < stepIdx
                    ? 'bg-brand-500 text-white'
                    : i === stepIdx
                      ? 'bg-brand-50 text-brand-600 ring-brand-500 dark:bg-brand-500/20 dark:text-brand-400 ring-1'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                }`}
              >
                {i < stepIdx ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  i === stepIdx
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < WIZARD_STEPS.length - 1 && (
                <ChevronRight className="mx-0.5 h-3.5 w-3.5 text-gray-300 dark:text-gray-700" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {step === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Check ID *
                  </label>
                  <input
                    autoFocus
                    value={form.id}
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                    disabled={isEdit}
                    placeholder="my_check_id"
                    className={cosmosInput + (isEdit ? ' opacity-50' : '')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Display name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Human readable name"
                    className={cosmosInput}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Scope *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SCOPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setForm((f) => ({ ...f, scope: opt.value }))}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        form.scope === opt.value
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                      }`}
                    >
                      <p
                        className={`text-xs font-bold ${form.scope === opt.value ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Kind
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {KIND_OPTIONS.map((k) => (
                    <button
                      key={k}
                      onClick={() => setForm((f) => ({ ...f, kind: f.kind === k ? '' : k }))}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        form.kind === k
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'expression' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  PromQL Expression *
                </label>
                <textarea
                  autoFocus
                  value={form.expr}
                  onChange={(e) => setForm((f) => ({ ...f, expr: e.target.value }))}
                  placeholder={`metric_name{instance=~"$instances"}`}
                  rows={4}
                  className={cosmosInput + ' resize-none font-mono text-xs'}
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-600">
                  Use{' '}
                  <code className="rounded bg-gray-100 px-1 font-mono dark:bg-gray-800">
                    $instances
                  </code>
                  ,{' '}
                  <code className="rounded bg-gray-100 px-1 font-mono dark:bg-gray-800">
                    $chassis
                  </code>
                  , or{' '}
                  <code className="rounded bg-gray-100 px-1 font-mono dark:bg-gray-800">
                    $racks
                  </code>{' '}
                  as placeholders.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Output type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['bool', 'numeric'] as const).map((out) => (
                    <button
                      key={out}
                      onClick={() => setForm((f) => ({ ...f, output: out }))}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        form.output === out
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
                      }`}
                    >
                      <p
                        className={`text-sm font-bold ${form.output === out ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {out}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {out === 'bool' ? 'Returns 0 or 1 (up/down)' : 'Returns a numeric value'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'rules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Severity rules
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Define when the check triggers WARN or CRIT
                  </p>
                </div>
                <button
                  onClick={addRule}
                  className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Rule
                </button>
              </div>

              {form.rules.length === 0 && (
                <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-600">
                    No rules yet — click "Add Rule" to define severity thresholds
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {form.rules.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                      When
                    </span>
                    <select
                      value={rule.op}
                      onChange={(e) => updateRule(i, { op: e.target.value })}
                      className="focus:border-brand-500 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {['==', '!=', '>', '>=', '<', '<='].map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={String(rule.value)}
                      onChange={(e) => updateRule(i, { value: parseFloat(e.target.value) || 0 })}
                      className="focus:border-brand-500 w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    />
                    <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                      →
                    </span>
                    <div className="flex gap-1">
                      {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((sev) => (
                        <button
                          key={sev}
                          onClick={() => updateRule(i, { severity: sev })}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                            rule.severity === sev
                              ? SEV_PILL[sev]
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => removeRule(i)}
                      className="ml-auto text-gray-300 hover:text-red-400 dark:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Ready to {isEdit ? 'update' : 'add'}
              </p>
              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                {[
                  { label: 'ID', value: form.id, mono: true },
                  ...(form.name ? [{ label: 'Name', value: form.name, mono: false }] : []),
                  { label: 'Scope', value: form.scope, mono: false },
                  ...(form.kind ? [{ label: 'Kind', value: form.kind, mono: false }] : []),
                  { label: 'Output', value: form.output, mono: false },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span
                      className={`text-gray-800 dark:text-gray-200 ${mono ? 'font-mono text-xs' : 'font-medium'}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
                {form.expr && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Expression</span>
                    <p className="rounded-lg bg-white px-3 py-2 font-mono text-xs break-all text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {form.expr}
                    </p>
                  </div>
                )}
                {form.rules.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Rules ({form.rules.length})
                    </span>
                    {form.rules.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                      >
                        <span className="font-mono">
                          {r.op} {String(r.value)}
                        </span>
                        <span>→</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_PILL[r.severity] ?? SEV_PILL.UNKNOWN}`}
                        >
                          {r.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={stepIdx === 0 ? onCancel : handleBack}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            {stepIdx === 0 ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4 rotate-180" /> Back
              </>
            )}
          </button>

          {step !== 'review' ? (
            <button
              onClick={handleNext}
              disabled={!canNext}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (form.id.trim()) onSave(form);
              }}
              disabled={!form.id.trim()}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {isEdit ? 'Update Check' : 'Add Check'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// FileListItem
// ---------------------------------------------------------------------------

type FileListItemProps = {
  name: string;
  selected: boolean;
  onClick: () => void;
  dirty: boolean;
};

const FileListItem = ({ name, selected, onClick, dirty }: FileListItemProps) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-all ${
      selected
        ? 'bg-brand-500/15 text-brand-400 font-semibold'
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    }`}
  >
    <span className="flex-1 truncate font-mono">{name}</span>
    {dirty && (
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />
    )}
  </button>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const CosmosChecksEditorPage = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [view, setView] = useState<'yaml' | 'visual'>('visual');
  const [checkForm, setCheckForm] = useState<{
    open: boolean;
    initial: CheckFormData;
    isEdit: boolean;
    editId: string | null;
  }>({ open: false, initial: EMPTY_FORM, isEdit: false, editId: null });
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Parse checks from YAML content for visual view
  const parsedChecks = useMemo((): CheckDef[] => {
    if (!content.trim()) return [];
    try {
      const data = yaml.load(content) as { checks?: CheckDef[] };
      return Array.isArray(data?.checks) ? data.checks : [];
    } catch {
      return [];
    }
  }, [content]);

  const isDirty = content !== savedContent;

  // Load file list
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await api.getChecksFiles();
        if (!active) return;
        const names = Array.isArray(data)
          ? (data as string[])
          : Array.isArray((data as { files?: { name: string }[] }).files)
            ? (data as { files: { name: string }[] }).files.map((f) => f.name)
            : [];
        setFiles(names);
        if (names.length > 0 && !selectedFile) setSelectedFile(names[0]);
        setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selectedFile]);

  // Load file content when selection changes
  useEffect(() => {
    if (!selectedFile) return;
    let active = true;
    const load = async () => {
      setLoadingFile(true);
      try {
        const data = await api.getChecksFile(selectedFile);
        if (!active) return;
        const text =
          typeof data === 'string' ? data : ((data as { content?: string }).content ?? '');
        setContent(text);
        setSavedContent(text);
      } catch {
        if (active) setContent('');
      } finally {
        if (active) setLoadingFile(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selectedFile]);

  // Save
  const handleSave = async () => {
    if (!selectedFile) return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      await api.updateChecksFile(selectedFile, content);
      setSavedContent(content);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Serialize updated checks array back to YAML and update content
  const serializeChecks = (checks: CheckDef[]) => {
    const cleaned = checks.map((c) => {
      const obj: Record<string, unknown> = { id: c.id };
      if (c.name) obj.name = c.name;
      if (c.scope) obj.scope = c.scope;
      if (c.kind) obj.kind = c.kind;
      if (c.expr) obj.expr = c.expr;
      if (c.output) obj.output = c.output;
      if (c.rules && c.rules.length > 0) obj.rules = c.rules;
      return obj;
    });
    return yaml.dump({ checks: cleaned }, { indent: 2, lineWidth: 120 });
  };

  const handleSaveCheck = (data: CheckFormData) => {
    const newCheck: CheckDef = {
      id: data.id.trim(),
      ...(data.name.trim() ? { name: data.name.trim() } : {}),
      ...(data.scope ? { scope: data.scope } : {}),
      ...(data.kind.trim() ? { kind: data.kind.trim() } : {}),
      ...(data.expr.trim() ? { expr: data.expr.trim() } : {}),
      output: data.output,
      ...(data.rules.length > 0 ? { rules: data.rules } : {}),
    };
    let updated: CheckDef[];
    if (checkForm.isEdit && checkForm.editId) {
      updated = parsedChecks.map((c) => (c.id === checkForm.editId ? newCheck : c));
    } else {
      updated = [...parsedChecks, newCheck];
    }
    setContent(serializeChecks(updated));
    setCheckForm({ open: false, initial: EMPTY_FORM, isEdit: false, editId: null });
  };

  const handleDeleteCheck = (id: string) => {
    const updated = parsedChecks.filter((c) => c.id !== id);
    setContent(serializeChecks(updated));
  };

  const openAddForm = () =>
    setCheckForm({ open: true, initial: EMPTY_FORM, isEdit: false, editId: null });

  const openEditForm = (check: CheckDef) =>
    setCheckForm({
      open: true,
      isEdit: true,
      editId: check.id,
      initial: {
        id: check.id,
        name: check.name ?? '',
        scope: check.scope ?? 'node',
        kind: check.kind ?? '',
        expr: check.expr ?? '',
        output: check.output ?? 'bool',
        rules: check.rules ?? [],
      },
    });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-800 bg-gray-950 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 flex h-9 w-9 items-center justify-center rounded-xl">
            <ShieldCheck className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Checks Library Editor</h1>
            <p className="text-xs text-gray-500">
              {selectedFile ? selectedFile : 'Health check definitions'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
            {(['visual', 'yaml'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  view === v
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                {v === 'visual' ? 'Visual' : 'YAML'}
              </button>
            ))}
          </div>
          {/* Save */}
          <button
            onClick={() => void handleSave()}
            disabled={!isDirty || !selectedFile || saveStatus === 'saving'}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              isDirty && selectedFile
                ? 'bg-brand-500 hover:bg-brand-600 text-white'
                : 'cursor-not-allowed bg-gray-800 text-gray-500'
            }`}
          >
            {saveStatus === 'saving' ? (
              'Saving...'
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="h-4 w-4" /> Saved
              </>
            ) : saveStatus === 'error' ? (
              'Error'
            ) : (
              <>
                <Check className="h-4 w-4" /> {isDirty ? 'Save' : 'Saved'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: File list */}
        <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-800 bg-gray-950">
          <div className="border-b border-gray-800 px-4 py-3">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Files
            </span>
          </div>
          <div className="flex-1 space-y-1 p-3">
            {loading ? (
              <div className="py-4 text-center text-xs text-gray-600">Loading...</div>
            ) : files.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-600">No files found</div>
            ) : (
              files.map((name) => (
                <FileListItem
                  key={name}
                  name={name}
                  selected={selectedFile === name}
                  dirty={selectedFile === name && isDirty}
                  onClick={() => setSelectedFile(name)}
                />
              ))
            )}
          </div>
          <div className="border-t border-gray-800 px-4 py-2">
            <span className="text-xs text-gray-600">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
          </div>
        </aside>

        {/* MAIN: YAML or Visual */}
        <main className="min-h-0 flex-1 overflow-hidden">
          {!selectedFile ? (
            <div className="flex h-full items-center justify-center">
              <p className="font-mono text-[11px] tracking-widest text-gray-600 uppercase">
                Select a file
              </p>
            </div>
          ) : loadingFile ? (
            <div className="flex h-full items-center justify-center">
              <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-700" />
            </div>
          ) : view === 'yaml' ? (
            /* YAML View: Monaco */
            <div className="h-full">
              <Editor
                height="100%"
                defaultLanguage="yaml"
                value={content}
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                onChange={(value) => setContent(value ?? '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  padding: { top: 16, bottom: 16 },
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                theme="vs-dark"
              />
            </div>
          ) : (
            /* Visual View: check cards */
            <div className="custom-scrollbar h-full overflow-y-auto p-6">
              {saveError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-xs text-red-400">
                  {saveError}
                </div>
              )}
              {parsedChecks.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4">
                  <p className="font-mono text-[11px] tracking-widest text-gray-600 uppercase">
                    {content.trim() ? 'No checks found (YAML parse error?)' : 'File is empty'}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={openAddForm}
                      className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add First Check
                    </button>
                    <button
                      onClick={() => setView('yaml')}
                      className="rounded-xl border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
                    >
                      Edit YAML
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">
                      {parsedChecks.length} check{parsedChecks.length !== 1 ? 's' : ''} —{' '}
                      {selectedFile}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={openAddForm}
                        className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Check
                      </button>
                      <button
                        onClick={() => setView('yaml')}
                        className="hover:text-brand-500 text-xs text-gray-400"
                      >
                        Edit YAML →
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {parsedChecks.map((check) => (
                      <CheckCard
                        key={check.id}
                        check={check}
                        onEdit={() => openEditForm(check)}
                        onDelete={() => handleDeleteCheck(check.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit check modal */}
      {checkForm.open && (
        <CheckForm
          initial={checkForm.initial}
          isEdit={checkForm.isEdit}
          onSave={handleSaveCheck}
          onCancel={() =>
            setCheckForm({ open: false, initial: EMPTY_FORM, isEdit: false, editId: null })
          }
        />
      )}
    </div>
  );
};
