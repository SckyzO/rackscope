import { useMemo, useState } from 'react';
import { api } from '../services/api';

type DeviceDraft = {
  id: string;
  name: string;
  type: string;
  u_height: string;
  rows: string;
  cols: string;
};

const defaultDraft: DeviceDraft = {
  id: '',
  name: '',
  type: 'server',
  u_height: '1',
  rows: '1',
  cols: '1',
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

  const matrixPreview = useMemo(() => {
    const rows = Number.parseInt(draft.rows, 10);
    const cols = Number.parseInt(draft.cols, 10);
    if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows <= 0 || cols <= 0) return [];
    return buildMatrix(rows, cols);
  }, [draft.rows, draft.cols]);

  const canSave = draft.id.trim() && draft.name.trim();

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
          type: 'grid',
          rows,
          cols,
          matrix: buildMatrix(rows, cols),
        },
      };
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
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
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
          {error && <div className="text-[11px] text-status-crit">{error}</div>}
        </section>

        <aside className="bg-rack-panel border border-rack-border rounded-3xl p-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-500">Preview</div>
          <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-200 mb-4">Matrix</h2>
          <div className="space-y-2">
            {matrixPreview.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-[11px] font-mono uppercase tracking-widest text-gray-500">
                Invalid layout
              </div>
            )}
            {matrixPreview.map((row, idx) => (
              <div key={idx} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                {row.map((cell) => (
                  <div key={cell} className="h-8 rounded bg-black/30 border border-white/10 flex items-center justify-center text-[10px] font-mono text-gray-400">
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
