import { useMemo, useState } from 'react';
import { api } from '../services/api';

type DeviceDraft = {
  id: string;
  name: string;
  type: string;
  u_height: string;
  rows: string;
  cols: string;
  layout_type: 'grid' | 'vertical';
  rear_enabled: boolean;
  rear_rows: string;
  rear_cols: string;
  rear_layout_type: 'grid' | 'vertical';
  rear_components: Array<{ id: string; name: string; type: string }>;
};

const defaultDraft: DeviceDraft = {
  id: '',
  name: '',
  type: 'server',
  u_height: '1',
  rows: '1',
  cols: '1',
  layout_type: 'grid',
  rear_enabled: false,
  rear_rows: '1',
  rear_cols: '1',
  rear_layout_type: 'grid',
  rear_components: [],
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

export const TemplatesEditorPage = () => {
  const [draft, setDraft] = useState<DeviceDraft>(defaultDraft);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showYaml, setShowYaml] = useState(false);
  const unitHeight = 48;
  const minPreviewHeight = 48;

  const matrixPreview = useMemo(() => {
    const rows = Number.parseInt(draft.rows, 10);
    const cols = Number.parseInt(draft.cols, 10);
    if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows <= 0 || cols <= 0) return [];
    return buildMatrix(rows, cols);
  }, [draft.rows, draft.cols]);

  const rearMatrixPreview = useMemo(() => {
    if (!draft.rear_enabled) return [];
    const rows = Number.parseInt(draft.rear_rows, 10);
    const cols = Number.parseInt(draft.rear_cols, 10);
    if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows <= 0 || cols <= 0) return [];
    return buildMatrix(rows, cols);
  }, [draft.rear_rows, draft.rear_cols, draft.rear_enabled]);

  const yamlPreview = useMemo(() => {
    const rows = Number.parseInt(draft.rows, 10);
    const cols = Number.parseInt(draft.cols, 10);
    const uHeight = Number.parseInt(draft.u_height, 10);
    const layout = {
      type: draft.layout_type,
      rows,
      cols,
      matrix: buildMatrix(rows, cols),
    };
    const template: Record<string, any> = {
      id: draft.id.trim() || 'template-id',
      name: draft.name.trim() || 'Template name',
      type: draft.type.trim() || 'server',
      u_height: Number.isFinite(uHeight) ? uHeight : 1,
      layout,
    };
    if (draft.rear_enabled) {
      const rearRows = Number.parseInt(draft.rear_rows, 10);
      const rearCols = Number.parseInt(draft.rear_cols, 10);
      template.rear_layout = {
        type: draft.rear_layout_type,
        rows: rearRows,
        cols: rearCols,
        matrix: buildMatrix(rearRows, rearCols),
      };
      template.rear_components = draft.rear_components.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }));
    }
    return `templates:\n  - ${JSON.stringify(template, null, 2).replace(/\n/g, '\n    ')}`;
  }, [draft]);

  const canSave = draft.id.trim() && draft.name.trim();
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

  const handleSave = async () => {
    if (!canSave) return;
    setStatus('saving');
    setError(null);
    try {
      const rows = Number.parseInt(draft.rows, 10);
      const cols = Number.parseInt(draft.cols, 10);
      const uHeight = Number.parseInt(draft.u_height, 10);
      const template = {
        id: draft.id.trim(),
        name: draft.name.trim(),
        type: draft.type.trim() || 'server',
        u_height: Number.isFinite(uHeight) ? uHeight : 1,
        layout: {
          type: draft.layout_type,
          rows,
          cols,
          matrix: buildMatrix(rows, cols),
        },
      };
      if (draft.rear_enabled) {
        const rearRows = Number.parseInt(draft.rear_rows, 10);
        const rearCols = Number.parseInt(draft.rear_cols, 10);
        template.rear_layout = {
          type: draft.rear_layout_type,
          rows: rearRows,
          cols: rearCols,
          matrix: buildMatrix(rearRows, rearCols),
        };
        template.rear_components = draft.rear_components.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }));
      }
      await api.createTemplate({ kind: 'device', template });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
      setDraft(defaultDraft);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
      setStatus('error');
    }
  };

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-gray-500">Templates</div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Editor</h1>
          <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
            Device template (basic)
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowYaml((prev) => !prev)}
            className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[var(--color-border)] text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            {showYaml ? 'Hide YAML' : 'Show YAML'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || status === 'saving'}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
              canSave
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/25'
                : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
            }`}
          >
            {status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_520px] gap-6">
        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-200">Device Template</h2>
          <label className="text-xs text-gray-400">
            Template ID
            <input
              value={draft.id}
              onChange={(e) => setDraft((prev) => ({ ...prev, id: e.target.value }))}
              className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
              placeholder="my-device-1u"
            />
          </label>
          <label className="text-xs text-gray-400">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
              placeholder="My Device"
            />
          </label>
          <label className="text-xs text-gray-400">
            Type
            <select
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
              className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
            >
              <option value="server">server</option>
              <option value="storage">storage</option>
              <option value="network">network</option>
              <option value="pdu">pdu</option>
              <option value="cooling">cooling</option>
              <option value="other">other</option>
            </select>
          </label>
          <label className="text-xs text-gray-400">
            Layout type
            <select
              value={draft.layout_type}
              onChange={(e) => setDraft((prev) => ({ ...prev, layout_type: e.target.value as DeviceDraft['layout_type'] }))}
              className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
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
              className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs text-gray-400">
              Layout rows
              <input
                type="number"
                value={draft.rows}
                onChange={(e) => setDraft((prev) => ({ ...prev, rows: e.target.value }))}
                className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
              />
            </label>
            <label className="text-xs text-gray-400">
              Layout cols
              <input
                type="number"
                value={draft.cols}
                onChange={(e) => setDraft((prev) => ({ ...prev, cols: e.target.value }))}
                className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
              />
            </label>
          </div>
          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">Rear layout</span>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, rear_enabled: !prev.rear_enabled }))}
                className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[var(--color-accent)]"
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
                    onChange={(e) => setDraft((prev) => ({ ...prev, rear_layout_type: e.target.value as DeviceDraft['rear_layout_type'] }))}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
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
                      onChange={(e) => setDraft((prev) => ({ ...prev, rear_rows: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                  <label className="text-xs text-gray-400">
                    Rear cols
                    <input
                      type="number"
                      value={draft.rear_cols}
                      onChange={(e) => setDraft((prev) => ({ ...prev, rear_cols: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Rear components</div>
                  {draft.rear_components.map((comp, idx) => (
                    <div key={comp.id || idx} className="grid grid-cols-3 gap-2">
                      <input
                        value={comp.id}
                        onChange={(e) => setDraft((prev) => {
                          const next = [...prev.rear_components];
                          next[idx] = { ...next[idx], id: e.target.value };
                          return { ...prev, rear_components: next };
                        })}
                        className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
                        placeholder="id"
                      />
                      <input
                        value={comp.name}
                        onChange={(e) => setDraft((prev) => {
                          const next = [...prev.rear_components];
                          next[idx] = { ...next[idx], name: e.target.value };
                          return { ...prev, rear_components: next };
                        })}
                        className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
                        placeholder="name"
                      />
                      <select
                        value={comp.type}
                        onChange={(e) => setDraft((prev) => {
                          const next = [...prev.rear_components];
                          next[idx] = { ...next[idx], type: e.target.value };
                          return { ...prev, rear_components: next };
                        })}
                        className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
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
                    onClick={() => setDraft((prev) => ({
                      ...prev,
                      rear_components: [...prev.rear_components, { id: '', name: '', type: 'psu' }],
                    }))}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[var(--color-accent)]"
                  >
                    + Add rear component
                  </button>
                </div>
              </div>
            )}
          </div>
          {error && <div className="text-[11px] text-status-crit">{error}</div>}
        </section>

        <aside className="bg-rack-panel border border-rack-border rounded-3xl p-6">
          {showYaml ? (
            <>
              <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-500">Preview</div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-200 mb-4">YAML</h2>
              <pre className="whitespace-pre-wrap text-[10px] font-mono bg-black/30 border border-white/10 rounded-2xl p-4 text-gray-300">
                {yamlPreview}
              </pre>
            </>
          ) : (
            <>
              <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-500">Preview</div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-200 mb-4">Device Preview</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">Front</div>
                  {matrixPreview.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-[11px] font-mono uppercase tracking-widest text-gray-500">
                      Invalid layout
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
                      <div className="flex gap-2">
                        <div className="w-6 text-[9px] font-mono text-gray-600 flex flex-col" style={{ height: `${previewHeight}px` }}>
                          {Array.from({ length: previewUCount }).map((_, idx) => (
                            <div key={idx} className="flex-1 flex items-center justify-center border-b border-white/10">
                              <span>{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                        <div
                          className="rounded-xl border border-white/10 bg-black/40 flex-1 p-2"
                          style={{ height: `${previewHeight}px` }}
                        >
                          <div
                            className="grid gap-1 h-full"
                            style={{ gridTemplateRows: `repeat(${matrixPreview.length}, minmax(0, 1fr))` }}
                          >
                            {matrixPreview.map((row, idx) => (
                              <div key={idx} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                                {row.map((cell) => (
                                  <div key={cell} className="rounded bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-mono text-gray-400">
                                    {cell}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="w-6 text-[9px] font-mono text-gray-600 flex flex-col" style={{ height: `${previewHeight}px` }}>
                          {Array.from({ length: previewUCount }).map((_, idx) => (
                            <div key={idx} className="flex-1 flex items-center justify-center border-b border-white/10">
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
                    <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">Rear</div>
                    {rearMatrixPreview.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-[11px] font-mono uppercase tracking-widest text-gray-500">
                        Invalid rear layout
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
                        <div className="flex gap-2">
                          <div className="w-6 text-[9px] font-mono text-gray-600 flex flex-col" style={{ height: `${previewHeight}px` }}>
                            {Array.from({ length: previewUCount }).map((_, idx) => (
                              <div key={idx} className="flex-1 flex items-center justify-center border-b border-white/10">
                                <span>{idx + 1}</span>
                              </div>
                            ))}
                          </div>
                          <div
                            className="rounded-xl border border-white/10 bg-black/40 flex-1 p-2"
                            style={{ height: `${previewHeight}px` }}
                          >
                            <div
                              className="grid gap-1 h-full"
                              style={{ gridTemplateRows: `repeat(${rearMatrixPreview.length}, minmax(0, 1fr))` }}
                            >
                              {rearMatrixPreview.map((row, idx) => (
                                <div key={idx} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                                  {row.map((cell) => (
                                    <div key={cell} className="rounded bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-mono text-gray-400">
                                      {cell}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="w-6 text-[9px] font-mono text-gray-600 flex flex-col" style={{ height: `${previewHeight}px` }}>
                            {Array.from({ length: previewUCount }).map((_, idx) => (
                              <div key={idx} className="flex-1 flex items-center justify-center border-b border-white/10">
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
