import { useState, useEffect, useMemo, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import yaml from 'js-yaml';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
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
  <div className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4">
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
            className="rounded-lg border border-[var(--color-border)] p-1.5 text-gray-500 hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete check"
            className="rounded-lg border border-[var(--color-border)] p-1.5 text-gray-500 hover:border-red-500/40 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <h3 className="font-mono text-sm font-bold text-[var(--color-text-base)]">{check.id}</h3>
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
// CheckForm — add / edit a check definition
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

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200 focus:border-[var(--color-accent)]/50 focus:outline-none';
const labelCls = 'block text-[11px] text-gray-500 uppercase tracking-[0.15em] font-mono mb-1';

const CheckForm = ({ initial, isEdit, onSave, onCancel }: CheckFormProps) => {
  const [form, setForm] = useState<CheckFormData>(initial);

  const addRule = () =>
    setForm((f) => ({ ...f, rules: [...f.rules, { op: '==', value: 0, severity: 'CRIT' }] }));

  const updateRule = (i: number, patch: Partial<CheckRule>) =>
    setForm((f) => {
      const rules = [...f.rules];
      rules[i] = { ...rules[i], ...patch };
      return { ...f, rules };
    });

  const removeRule = (i: number) =>
    setForm((f) => ({ ...f, rules: f.rules.filter((_, j) => j !== i) }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
              {isEdit ? 'Edit' : 'New'}
            </div>
            <h2 className="text-lg font-black tracking-tight text-[var(--color-text-base)] uppercase">
              Check Definition
            </h2>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          {/* Identity row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>ID *</label>
              <input
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                disabled={isEdit}
                placeholder="my_check_id"
                className={inputCls + (isEdit ? ' opacity-50' : '')}
              />
            </div>
            <div>
              <label className={labelCls}>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Human readable name"
                className={inputCls}
              />
            </div>
          </div>

          {/* Scope / Kind / Output */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                className={inputCls}
              >
                {['node', 'chassis', 'rack'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Kind</label>
              <input
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                placeholder="server, ipmi, pdu..."
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Output</label>
              <select
                value={form.output}
                onChange={(e) =>
                  setForm((f) => ({ ...f, output: e.target.value as 'bool' | 'numeric' }))
                }
                className={inputCls}
              >
                <option value="bool">bool</option>
                <option value="numeric">numeric</option>
              </select>
            </div>
          </div>

          {/* Expression */}
          <div>
            <label className={labelCls}>PromQL Expression</label>
            <textarea
              value={form.expr}
              onChange={(e) => setForm((f) => ({ ...f, expr: e.target.value }))}
              placeholder={`metric_name{instance=~"$instances"}`}
              rows={3}
              className={inputCls + ' resize-none font-mono text-[11px]'}
            />
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Rules</label>
              <button
                onClick={addRule}
                className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-[var(--color-accent)] uppercase hover:underline"
              >
                <Plus className="h-3 w-3" /> Add rule
              </button>
            </div>
            {form.rules.length === 0 && (
              <p className="font-mono text-[10px] text-gray-600">No rules yet — add one above.</p>
            )}
            {form.rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={rule.op}
                  onChange={(e) => updateRule(i, { op: e.target.value })}
                  className="rounded-lg border border-[var(--color-border)] bg-black/30 px-2 py-1.5 text-xs text-gray-200"
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
                  className="w-20 rounded-lg border border-[var(--color-border)] bg-black/30 px-2 py-1.5 text-xs text-gray-200"
                />
                <select
                  value={rule.severity}
                  onChange={(e) =>
                    updateRule(i, { severity: e.target.value as CheckRule['severity'] })
                  }
                  className="rounded-lg border border-[var(--color-border)] bg-black/30 px-2 py-1.5 text-xs font-bold text-gray-200"
                >
                  {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button onClick={() => removeRule(i)} className="text-gray-600 hover:text-red-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 font-mono text-xs tracking-widest text-gray-400 uppercase hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (form.id.trim()) onSave(form);
            }}
            disabled={!form.id.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 px-4 py-2 font-mono text-xs font-bold tracking-widest text-[var(--color-accent)] uppercase hover:bg-[var(--color-accent)]/25 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
            {isEdit ? 'Update' : 'Add'}
          </button>
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
    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left font-mono text-xs transition-all ${
      selected
        ? 'border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    }`}
  >
    <span className="flex-1 truncate">{name}</span>
    {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Unsaved changes" />}
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
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-panel)] px-8 py-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.45em] text-gray-500 uppercase">
            Checks
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-base)] uppercase">
            Library Editor
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            {(['visual', 'yaml'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors ${
                  view === v
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {/* Filename */}
          {selectedFile && (
            <span className="font-mono text-[11px] text-gray-500">{selectedFile}</span>
          )}
          {/* Save */}
          <button
            onClick={() => {
              void handleSave();
            }}
            disabled={!isDirty || !selectedFile || saveStatus === 'saving'}
            className={`rounded-lg px-4 py-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors ${
              isDirty && selectedFile
                ? 'border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25'
                : 'cursor-not-allowed border border-white/10 bg-white/5 text-gray-600'
            }`}
          >
            {saveStatus === 'saving'
              ? 'Saving...'
              : saveStatus === 'saved'
                ? 'Saved ✓'
                : saveStatus === 'error'
                  ? 'Error'
                  : isDirty
                    ? 'Save'
                    : 'Saved'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: File list */}
        <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-panel)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <span className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
              Files
            </span>
          </div>
          <div className="flex-1 space-y-1 p-3">
            {loading ? (
              <div className="py-4 text-center font-mono text-[10px] text-gray-600">Loading...</div>
            ) : files.length === 0 ? (
              <div className="py-4 text-center font-mono text-[10px] text-gray-600">
                No files found
              </div>
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
          <div className="border-t border-[var(--color-border)] px-4 py-2">
            <span className="font-mono text-[10px] text-gray-600">
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
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-[var(--color-accent)]" />
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
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-[var(--color-accent)] uppercase hover:bg-[var(--color-accent)]/20"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add First Check
                    </button>
                    <button
                      onClick={() => setView('yaml')}
                      className="rounded-lg border border-[var(--color-border)] px-4 py-2 font-mono text-[10px] tracking-widest text-gray-500 uppercase hover:text-gray-300"
                    >
                      Edit YAML
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                      {parsedChecks.length} check
                      {parsedChecks.length !== 1 ? 's' : ''} — {selectedFile}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={openAddForm}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-[var(--color-accent)] uppercase hover:bg-[var(--color-accent)]/20"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Check
                      </button>
                      <button
                        onClick={() => setView('yaml')}
                        className="font-mono text-[10px] tracking-widest text-gray-500 uppercase hover:text-[var(--color-accent)]"
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
