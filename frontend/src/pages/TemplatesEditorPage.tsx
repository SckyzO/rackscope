import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Editor, { type OnMount } from '@monaco-editor/react';
import yaml from 'js-yaml';
import { api } from '../services/api';
import type { DeviceTemplate, CheckDefinition } from '../types';

type DeviceDraft = {
  id: string;
  name: string;
  type: string;
  u_height: string;
  rows: string;
  cols: string;
  layout_type: 'grid' | 'vertical';
  layout_matrix?: number[][];
  rear_enabled: boolean;
  rear_rows: string;
  rear_cols: string;
  rear_layout_type: 'grid' | 'vertical';
  rear_layout_matrix?: number[][];
  rear_components: Array<{ id: string; name: string; type: string; checks?: string[] }>;
  checks: string[];
};

const defaultDraft: DeviceDraft = {
  id: '',
  name: '',
  type: 'server',
  u_height: '1',
  rows: '1',
  cols: '1',
  layout_type: 'grid',
  layout_matrix: undefined,
  rear_enabled: false,
  rear_rows: '1',
  rear_cols: '1',
  rear_layout_type: 'grid',
  rear_layout_matrix: undefined,
  rear_components: [],
  checks: [],
};

const buildMatrix = (rows: number, cols: number) => {
  const matrix = [];
  let counter = 1;
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      row.push(counter);
      counter += 1;
    }
    matrix.push(row);
  }
  return matrix;
};

const buildPreviewMatrix = (rows: number, cols: number, matrix?: number[][]) => {
  if (matrix && matrix.length === rows && matrix.every((row) => row.length === cols)) {
    return matrix;
  }
  return buildMatrix(rows, cols);
};

const toDraftFromTemplate = (selected: DeviceTemplate): DeviceDraft => ({
  id: selected.id,
  name: selected.name,
  type: selected.type || 'server',
  u_height: String(selected.u_height || 1),
  rows: String(selected.layout?.rows || 1),
  cols: String(selected.layout?.cols || 1),
  layout_type: (selected.layout?.type as DeviceDraft['layout_type']) || 'grid',
  layout_matrix: selected.layout?.matrix,
  rear_enabled: Boolean(selected.rear_layout),
  rear_rows: String(selected.rear_layout?.rows || 1),
  rear_cols: String(selected.rear_layout?.cols || 1),
  rear_layout_type: (selected.rear_layout?.type as DeviceDraft['rear_layout_type']) || 'grid',
  rear_layout_matrix: selected.rear_layout?.matrix,
  rear_components: (selected.rear_components || []).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    checks: c.checks || [],
  })),
  checks: selected.checks || [],
});

export const TemplatesEditorPage = () => {
  const [draft, setDraft] = useState<DeviceDraft>(defaultDraft);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showYaml, setShowYaml] = useState(false);
  const [yamlText, setYamlText] = useState('');
  const [yamlErrors, setYamlErrors] = useState<string[]>([]);
  const [yamlValidationErrors, setYamlValidationErrors] = useState<string[]>([]);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [checksLibrary, setChecksLibrary] = useState<CheckDefinition[]>([]);
  const [searchParams] = useSearchParams();
  const initialTemplateId = searchParams.get('id') || '';
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [isEditing, setIsEditing] = useState(false);
  const unitHeight = 48;
  const minPreviewHeight = 48;
  const yamlTimer = useRef<number | null>(null);
  const [yamlSource, setYamlSource] = useState<'form' | 'editor'>('form');
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const applyTemplate = useCallback((selected: DeviceTemplate) => {
    setSelectedTemplateId(selected.id);
    setDraft(toDraftFromTemplate(selected));
    setIsEditing(true);
    setStatus('idle');
    setError(null);
    setYamlErrors([]);
    setYamlValidationErrors([]);
    setYamlSource('form');
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([api.getCatalog(), api.getChecks()])
      .then(([catalog, checks]) => {
        if (!active) return;
        const templates = catalog.device_templates || [];
        setDeviceTemplates(templates);
        setChecksLibrary(checks?.checks || []);
        if (initialTemplateId) {
          const selected = templates.find((t) => t.id === initialTemplateId);
          if (selected) applyTemplate(selected);
        }
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [applyTemplate, initialTemplateId]);

  const buildTemplateFromDraft = useCallback(() => {
    const rows = Number.parseInt(draft.rows, 10);
    const cols = Number.parseInt(draft.cols, 10);
    const uHeight = Number.parseInt(draft.u_height, 10);
    const layout = {
      type: draft.layout_type,
      rows,
      cols,
      matrix: buildPreviewMatrix(rows, cols, draft.layout_matrix),
    };
    const template: Record<string, unknown> = {
      id: draft.id.trim() || 'template-id',
      name: draft.name.trim() || 'Template name',
      type: draft.type.trim() || 'server',
      u_height: Number.isFinite(uHeight) ? uHeight : 1,
      layout,
      checks: draft.checks || [],
    };
    if (draft.rear_enabled) {
      const rearRows = Number.parseInt(draft.rear_rows, 10);
      const rearCols = Number.parseInt(draft.rear_cols, 10);
      template.rear_layout = {
        type: draft.rear_layout_type,
        rows: rearRows,
        cols: rearCols,
        matrix: buildPreviewMatrix(rearRows, rearCols, draft.rear_layout_matrix),
      };
      template.rear_components = draft.rear_components.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        checks: c.checks,
      }));
    }
    return template;
  }, [draft]);

  const matrixPreview = useMemo(() => {
    const rows = Number.parseInt(draft.rows, 10);
    const cols = Number.parseInt(draft.cols, 10);
    if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows <= 0 || cols <= 0) return [];
    return buildPreviewMatrix(rows, cols, draft.layout_matrix);
  }, [draft.rows, draft.cols, draft.layout_matrix]);

  const rearMatrixPreview = useMemo(() => {
    if (!draft.rear_enabled) return [];
    const rows = Number.parseInt(draft.rear_rows, 10);
    const cols = Number.parseInt(draft.rear_cols, 10);
    if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows <= 0 || cols <= 0) return [];
    return buildPreviewMatrix(rows, cols, draft.rear_layout_matrix);
  }, [draft.rear_rows, draft.rear_cols, draft.rear_enabled, draft.rear_layout_matrix]);

  const yamlPreview = useMemo(() => {
    const template = buildTemplateFromDraft();

    // Generate YAML in block style
    const yamlText = yaml.dump(
      { templates: [template] },
      {
        noRefs: true,
        lineWidth: 120,
        quotingType: '"',
        forceQuotes: false,
      }
    );

    // Post-process: Convert matrix arrays to compact flow style
    // Convert blocks like:
    //   matrix:
    //   - - 1
    //     - 2
    //   - - 3
    //     - 4
    // Into:
    //   matrix:
    //   - [1, 2]
    //   - [3, 4]

    const lines = yamlText.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if this is a "matrix:" line
      if (line.trim() === 'matrix:' || line.match(/^\s+matrix:\s*$/)) {
        result.push(line);
        i++;

        const baseIndent = line.match(/^(\s*)/)?.[1].length || 0;

        // Process matrix rows
        while (i < lines.length) {
          const matrixLine = lines[i];
          const currentIndent = matrixLine.match(/^(\s*)/)?.[1].length || 0;

          // If we've moved to a new key (less or equal indent), break
          if (matrixLine.trim() && currentIndent <= baseIndent) {
            break;
          }

          // Check if this is the start of a matrix row (- - number pattern)
          if (matrixLine.match(/^\s+- - \d+/)) {
            const numbers: string[] = [];
            const rowIndent = matrixLine.match(/^(\s*)/)?.[1] || '';

            // Collect all numbers in this row
            let j = i;
            while (j < lines.length) {
              const numLine = lines[j];
              const numMatch = numLine.match(/^\s+- (\d+)$/);
              if (numMatch) {
                numbers.push(numMatch[1]);
                j++;
              } else {
                break;
              }
            }

            // Write the row in flow style
            result.push(`${rowIndent}- [${numbers.join(', ')}]`);
            i = j;
          } else {
            // Not a matrix row, just add the line
            result.push(matrixLine);
            i++;
          }
        }
      } else {
        result.push(line);
        i++;
      }
    }

    return result.join('\n');
  }, [buildTemplateFromDraft]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const uHeight = Number.parseInt(draft.u_height, 10);
    const rows = Number.parseInt(draft.rows, 10);
    const cols = Number.parseInt(draft.cols, 10);
    if (!draft.id.trim()) errors.push('Template ID is required.');
    if (!draft.name.trim()) errors.push('Name is required.');
    if (!Number.isFinite(uHeight) || uHeight <= 0) errors.push('U height must be greater than 0.');
    if (!Number.isFinite(rows) || rows <= 0) errors.push('Layout rows must be greater than 0.');
    if (!Number.isFinite(cols) || cols <= 0) errors.push('Layout cols must be greater than 0.');
    if (!isEditing && deviceTemplates.some((t) => t.id === draft.id.trim())) {
      errors.push('Template ID already exists.');
    }
    return errors;
  }, [draft, deviceTemplates, isEditing]);

  const validateYaml = useCallback(
    async (text: string) => {
      const nextErrors: string[] = [];
      let parsedTemplate: Record<string, unknown> | null = null;
      try {
        const data = yaml.load(text);
        if (!data || typeof data !== 'object') {
          nextErrors.push('YAML must contain a top-level object.');
        } else if (!Array.isArray((data as { templates?: unknown }).templates)) {
          nextErrors.push('YAML must include templates: [ ... ].');
        } else {
          const templates = (data as { templates: unknown[] }).templates;
          if (!templates.length || typeof templates[0] !== 'object' || !templates[0]) {
            nextErrors.push('templates must include at least one template object.');
          } else {
            parsedTemplate = templates[0] as Record<string, unknown>;
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid YAML';
        nextErrors.push(message);
        const mark = (err as { mark?: { line?: number; column?: number } }).mark;
        if (mark && monacoRef.current && editorRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            monacoRef.current.editor.setModelMarkers(model, 'yaml', [
              {
                message,
                severity: monacoRef.current.MarkerSeverity.Error,
                startLineNumber: (mark.line ?? 0) + 1,
                startColumn: (mark.column ?? 0) + 1,
                endLineNumber: (mark.line ?? 0) + 1,
                endColumn: (mark.column ?? 0) + 2,
              },
            ]);
          }
        }
      }

      setYamlErrors(nextErrors);
      if (nextErrors.length > 0) {
        return;
      }

      if (monacoRef.current && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          monacoRef.current.editor.setModelMarkers(model, 'yaml', []);
        }
      }

      if (parsedTemplate) {
        try {
          const template = parsedTemplate as DeviceTemplate;
          setDraft(toDraftFromTemplate(template));
        } catch {
          // Ignore draft conversion errors.
        }
        try {
          await api.validateTemplate({ kind: 'device', template: parsedTemplate });
          setYamlValidationErrors([]);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Validation failed';
          setYamlValidationErrors([message]);
        }
      }
    },
    [setDraft]
  );

  useEffect(() => {
    if (!showYaml) return undefined;
    if (yamlTimer.current) {
      window.clearTimeout(yamlTimer.current);
    }
    const textToValidate = yamlSource === 'editor' ? yamlText : yamlPreview;
    yamlTimer.current = window.setTimeout(() => {
      validateYaml(textToValidate);
    }, 400);
    return () => {
      if (yamlTimer.current) {
        window.clearTimeout(yamlTimer.current);
      }
    };
  }, [showYaml, yamlSource, yamlText, yamlPreview, validateYaml]);

  const canSave = validationErrors.length === 0;
  const previewHeight = (() => {
    const uHeight = Number.parseInt(draft.u_height, 10);
    if (!Number.isFinite(uHeight) || uHeight <= 0) return minPreviewHeight;
    return Math.max(uHeight * unitHeight, minPreviewHeight);
  })();
  const previewUCount = (() => {
    const uHeight = Number.parseInt(draft.u_height, 10);
    if (!Number.isFinite(uHeight) || uHeight <= 0) return 1;
    return uHeight;
  })();

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const handleSave = async () => {
    if (!canSave) return;
    setStatus('saving');
    setError(null);
    try {
      const template = buildTemplateFromDraft();
      template.id = draft.id.trim();
      template.name = draft.name.trim();
      template.type = draft.type.trim() || 'server';
      if (isEditing) {
        await api.updateTemplate({ kind: 'device', template });
      } else {
        await api.createTemplate({ kind: 'device', template });
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
      if (!isEditing) {
        setDraft(defaultDraft);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
      setStatus('error');
    }
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[0.45em] text-gray-500 uppercase">
            Templates
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Editor</h1>
          <div className="mt-2 font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase">
            Device template (basic)
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedTemplateId('');
              setIsEditing(false);
              setDraft(defaultDraft);
              setStatus('idle');
              setError(null);
              setYamlErrors([]);
              setYamlValidationErrors([]);
              setYamlSource('form');
            }}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
          >
            New Template
          </button>
          <button
            type="button"
            onClick={() =>
              setShowYaml((prev) => {
                const next = !prev;
                if (next) {
                  setYamlSource('form');
                  setYamlErrors([]);
                  setYamlValidationErrors([]);
                }
                return next;
              })
            }
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
          >
            {showYaml ? 'Hide YAML' : 'Show YAML'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || status === 'saving'}
            className={`rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${
              canSave
                ? 'border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25'
                : 'cursor-not-allowed border border-white/10 bg-white/5 text-gray-500'
            }`}
          >
            {status === 'saving'
              ? 'Saving'
              : status === 'saved'
                ? 'Saved'
                : isEditing
                  ? 'Update'
                  : 'Save'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
        <section className="bg-rack-panel border-rack-border space-y-4 rounded-3xl border p-6">
          <h2 className="text-lg font-bold tracking-[0.2em] text-gray-200 uppercase">
            Device Template
          </h2>
          <label className="text-xs text-gray-400">
            Load existing
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                const nextId = e.target.value;
                const selected = deviceTemplates.find((t) => t.id === nextId);
                if (!selected) {
                  setSelectedTemplateId(nextId);
                  setIsEditing(false);
                  setDraft(defaultDraft);
                  return;
                }
                applyTemplate(selected);
              }}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
            >
              <option value="">New device template</option>
              {deviceTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-400">
            Template ID
            <input
              value={draft.id}
              onChange={(e) => setDraft((prev) => ({ ...prev, id: e.target.value }))}
              disabled={isEditing}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
              placeholder="my-device-1u"
            />
          </label>
          <label className="text-xs text-gray-400">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
              placeholder="My Device"
            />
          </label>
          <label className="text-xs text-gray-400">
            Type
            <select
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
            >
              <option value="server">server</option>
              <option value="storage">storage</option>
              <option value="network">network</option>
              <option value="pdu">pdu</option>
              <option value="cooling">cooling</option>
              <option value="other">other</option>
            </select>
          </label>
          <div className="space-y-2">
            <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
              Checks (node/chassis)
            </div>
            <div className="custom-scrollbar grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {checksLibrary
                .filter((c) => c.scope === 'node' || c.scope === 'chassis')
                .map((check) => {
                  const isChecked = draft.checks.includes(check.id);
                  return (
                    <label key={check.id} className="flex items-center gap-2 text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...draft.checks, check.id]
                            : draft.checks.filter((id) => id !== check.id);
                          setDraft((prev) => ({ ...prev, checks: next }));
                        }}
                        className="rounded border-gray-600 bg-black/40"
                      />
                      <span className="truncate">{check.name || check.id}</span>
                      <span className="text-[9px] text-gray-500 uppercase">{check.scope}</span>
                      {check.kind && (
                        <span className="text-[9px] text-gray-500 uppercase">{check.kind}</span>
                      )}
                    </label>
                  );
                })}
            </div>
            {draft.checks.length === 0 && (
              <div className="text-[10px] text-gray-500">No checks selected.</div>
            )}
          </div>
          <label className="text-xs text-gray-400">
            Layout type
            <select
              value={draft.layout_type}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  layout_type: e.target.value as DeviceDraft['layout_type'],
                  layout_matrix: undefined,
                }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
            >
              <option value="grid">grid</option>
              <option value="vertical">vertical</option>
            </select>
          </label>
          <label className="text-xs text-gray-400">
            U height
            <input
              type="number"
              value={draft.u_height}
              onChange={(e) => setDraft((prev) => ({ ...prev, u_height: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs text-gray-400">
              Layout rows
              <input
                type="number"
                value={draft.rows}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, rows: e.target.value, layout_matrix: undefined }))
                }
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
              />
            </label>
            <label className="text-xs text-gray-400">
              Layout cols
              <input
                type="number"
                value={draft.cols}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, cols: e.target.value, layout_matrix: undefined }))
                }
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
              />
            </label>
          </div>
          <div className="space-y-3 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase">
                Rear layout
              </span>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, rear_enabled: !prev.rear_enabled }))}
                className="text-[10px] font-bold tracking-widest text-gray-400 uppercase hover:text-[var(--color-accent)]"
              >
                {draft.rear_enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
            {draft.rear_enabled && (
              <div className="space-y-3">
                <label className="text-xs text-gray-400">
                  Rear layout type
                  <select
                    value={draft.rear_layout_type}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        rear_layout_type: e.target.value as DeviceDraft['rear_layout_type'],
                        rear_layout_matrix: undefined,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
                  >
                    <option value="grid">grid</option>
                    <option value="vertical">vertical</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-xs text-gray-400">
                    Rear rows
                    <input
                      type="number"
                      value={draft.rear_rows}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          rear_rows: e.target.value,
                          rear_layout_matrix: undefined,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                  <label className="text-xs text-gray-400">
                    Rear cols
                    <input
                      type="number"
                      value={draft.rear_cols}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          rear_cols: e.target.value,
                          rear_layout_matrix: undefined,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                    Rear components
                  </div>
                  {draft.rear_components.map((comp, idx) => (
                    <div key={comp.id || idx} className="grid grid-cols-3 gap-2">
                      <input
                        value={comp.id}
                        onChange={(e) =>
                          setDraft((prev) => {
                            const next = [...prev.rear_components];
                            next[idx] = { ...next[idx], id: e.target.value };
                            return { ...prev, rear_components: next };
                          })
                        }
                        className="rounded-lg border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs text-gray-200"
                        placeholder="id"
                      />
                      <input
                        value={comp.name}
                        onChange={(e) =>
                          setDraft((prev) => {
                            const next = [...prev.rear_components];
                            next[idx] = { ...next[idx], name: e.target.value };
                            return { ...prev, rear_components: next };
                          })
                        }
                        className="rounded-lg border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs text-gray-200"
                        placeholder="name"
                      />
                      <select
                        value={comp.type}
                        onChange={(e) =>
                          setDraft((prev) => {
                            const next = [...prev.rear_components];
                            next[idx] = { ...next[idx], type: e.target.value };
                            return { ...prev, rear_components: next };
                          })
                        }
                        className="rounded-lg border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs text-gray-200"
                      >
                        <option value="psu">psu</option>
                        <option value="fan">fan</option>
                        <option value="io">io</option>
                        <option value="hydraulics">hydraulics</option>
                        <option value="other">other</option>
                      </select>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        rear_components: [
                          ...prev.rear_components,
                          { id: '', name: '', type: 'psu' },
                        ],
                      }))
                    }
                    className="text-[10px] font-bold tracking-widest text-gray-400 uppercase hover:text-[var(--color-accent)]"
                  >
                    + Add rear component
                  </button>
                </div>
              </div>
            )}
          </div>
          {validationErrors.length > 0 && (
            <div className="text-status-warn space-y-1 text-[11px]">
              {validationErrors.slice(0, 3).map((message) => (
                <div key={message}>{message}</div>
              ))}
              {validationErrors.length > 3 && <div>{`+${validationErrors.length - 3} more`}</div>}
            </div>
          )}
          {error && <div className="text-status-crit text-[11px]">{error}</div>}
        </section>

        <aside className="bg-rack-panel border-rack-border rounded-3xl border p-6">
          {showYaml ? (
            <>
              <div className="font-mono text-[10px] tracking-[0.35em] text-gray-500 uppercase">
                Preview
              </div>
              <h2 className="mb-4 text-lg font-bold tracking-[0.2em] text-gray-200 uppercase">
                YAML
              </h2>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <Editor
                  height="520px"
                  defaultLanguage="yaml"
                  value={yamlSource === 'editor' ? yamlText : yamlPreview}
                  onMount={handleEditorMount}
                  onChange={(value) => {
                    setYamlSource('editor');
                    setYamlText(value ?? '');
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    tabSize: 2,
                    padding: { top: 12, bottom: 12 },
                  }}
                  theme="vs-dark"
                />
              </div>
              {(yamlErrors.length > 0 || yamlValidationErrors.length > 0) && (
                <div className="mt-4 space-y-2 text-[11px]">
                  {yamlErrors.map((message, idx) => (
                    <div key={`yaml-error-${idx}`} className="text-status-crit">
                      {message}
                    </div>
                  ))}
                  {yamlValidationErrors.map((message, idx) => (
                    <div key={`yaml-validate-${idx}`} className="text-status-warn">
                      {message}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="font-mono text-[10px] tracking-[0.35em] text-gray-500 uppercase">
                Preview
              </div>
              <h2 className="mb-4 text-lg font-bold tracking-[0.2em] text-gray-200 uppercase">
                Device Preview
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase">
                    Front
                  </div>
                  {matrixPreview.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center font-mono text-[11px] tracking-widest text-gray-500 uppercase">
                      Invalid layout
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
                      <div className="flex gap-2">
                        <div
                          className="flex w-6 flex-col font-mono text-[9px] text-gray-600"
                          style={{ height: `${previewHeight}px` }}
                        >
                          {Array.from({ length: previewUCount }).map((_, idx) => (
                            <div
                              key={idx}
                              className="flex flex-1 items-center justify-center border-b border-white/10"
                            >
                              <span>{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                        <div
                          className="flex-1 rounded-xl border border-white/10 bg-black/40 p-2"
                          style={{ height: `${previewHeight}px` }}
                        >
                          <div
                            className="grid h-full gap-1"
                            style={{
                              gridTemplateRows: `repeat(${matrixPreview.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {matrixPreview.map((row, idx) => (
                              <div
                                key={idx}
                                className="grid gap-1"
                                style={{
                                  gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                                }}
                              >
                                {row.map((cell) => (
                                  <div
                                    key={cell}
                                    className="flex items-center justify-center rounded border border-white/10 bg-black/40 font-mono text-[10px] text-gray-400"
                                  >
                                    {cell}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div
                          className="flex w-6 flex-col font-mono text-[9px] text-gray-600"
                          style={{ height: `${previewHeight}px` }}
                        >
                          {Array.from({ length: previewUCount }).map((_, idx) => (
                            <div
                              key={idx}
                              className="flex flex-1 items-center justify-center border-b border-white/10"
                            >
                              <span>{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {draft.rear_enabled && (
                  <div className="space-y-2">
                    <div className="font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase">
                      Rear
                    </div>
                    {rearMatrixPreview.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center font-mono text-[11px] tracking-widest text-gray-500 uppercase">
                        Invalid rear layout
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
                        <div className="flex gap-2">
                          <div
                            className="flex w-6 flex-col font-mono text-[9px] text-gray-600"
                            style={{ height: `${previewHeight}px` }}
                          >
                            {Array.from({ length: previewUCount }).map((_, idx) => (
                              <div
                                key={idx}
                                className="flex flex-1 items-center justify-center border-b border-white/10"
                              >
                                <span>{idx + 1}</span>
                              </div>
                            ))}
                          </div>
                          <div
                            className="flex-1 rounded-xl border border-white/10 bg-black/40 p-2"
                            style={{ height: `${previewHeight}px` }}
                          >
                            <div
                              className="grid h-full gap-1"
                              style={{
                                gridTemplateRows: `repeat(${rearMatrixPreview.length}, minmax(0, 1fr))`,
                              }}
                            >
                              {rearMatrixPreview.map((row, idx) => (
                                <div
                                  key={idx}
                                  className="grid gap-1"
                                  style={{
                                    gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {row.map((cell) => (
                                    <div
                                      key={cell}
                                      className="flex items-center justify-center rounded border border-white/10 bg-black/40 font-mono text-[10px] text-gray-400"
                                    >
                                      {cell}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div
                            className="flex w-6 flex-col font-mono text-[9px] text-gray-600"
                            style={{ height: `${previewHeight}px` }}
                          >
                            {Array.from({ length: previewUCount }).map((_, idx) => (
                              <div
                                key={idx}
                                className="flex flex-1 items-center justify-center border-b border-white/10"
                              >
                                <span>{idx + 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
