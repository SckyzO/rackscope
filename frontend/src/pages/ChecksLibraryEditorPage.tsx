import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { CheckDefinition, Catalog } from '../types';

type ChecksFile = {
  name: string;
  path: string;
  relative: string;
};

export const ChecksLibraryEditorPage = () => {
  const [files, setFiles] = useState<ChecksFile[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>(
    'loading'
  );
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getChecksFiles()
      .then((data) => {
        if (!active) return;
        setFiles(data.files || []);
        if (data.files?.length) {
          setSelectedFile(data.files[0].name);
        } else {
          setStatus('idle');
        }
      })
      .catch((err) => setError(err?.message || 'Failed to load files'));
    api
      .getChecks()
      .then((data) => {
        if (!active) return;
        setChecks(data?.checks || []);
      })
      .catch(console.error);
    api
      .getCatalog()
      .then((data) => {
        if (!active) return;
        setCatalog(data || null);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    let active = true;
    api
      .getChecksFile(selectedFile)
      .then((data) => {
        if (!active) return;
        setContent(data.content || '');
        setStatus('idle');
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setStatus('error');
        setError(err?.message || 'Failed to load file');
      });
    return () => {
      active = false;
    };
  }, [selectedFile]);

  const isDirty = useMemo(() => content.trim().length > 0, [content]);
  const usageByCheck = useMemo(() => {
    const usage: Record<string, number> = {};
    const deviceTemplates = catalog?.device_templates || [];
    const rackTemplates = catalog?.rack_templates || [];
    for (const template of deviceTemplates) {
      (template.checks || []).forEach((id: string) => {
        usage[id] = (usage[id] || 0) + 1;
      });
    }
    for (const template of rackTemplates) {
      (template.checks || []).forEach((id: string) => {
        usage[id] = (usage[id] || 0) + 1;
      });
    }
    return usage;
  }, [catalog]);

  const handleSave = async () => {
    if (!selectedFile) return;
    setStatus('saving');
    setError(null);
    try {
      await api.updateChecksFile(selectedFile, content);
      setError(null);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setStatus('error');
      setError(message);
    }
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[0.45em] text-gray-500 uppercase">
            Checks
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Library Editor</h1>
          <div className="mt-2 font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase">
            Edit checks library files
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || status === 'saving'}
          className={`rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${
            isDirty
              ? 'border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25'
              : 'cursor-not-allowed border border-white/10 bg-white/5 text-gray-500'
          }`}
        >
          {status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : 'Save'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="bg-rack-panel border-rack-border space-y-3 rounded-3xl border p-4">
          <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            Files
          </div>
          <div className="space-y-1">
            {files.map((file) => (
              <button
                key={file.name}
                type="button"
                onClick={() => {
                  setStatus('loading');
                  setSelectedFile(file.name);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left font-mono text-[11px] ${
                  selectedFile === file.name
                    ? 'border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                    : 'border border-transparent text-gray-300 hover:bg-white/5'
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>
        </aside>

        <section className="bg-rack-panel border-rack-border space-y-3 rounded-3xl border p-6">
          <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">YAML</div>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            className="min-h-[520px] w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-[11px] text-gray-200"
          />
          {error && (
            <pre className="text-status-crit rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] whitespace-pre-wrap">
              {error}
            </pre>
          )}
        </section>

        <aside className="bg-rack-panel border-rack-border space-y-3 rounded-3xl border p-4">
          <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            Checks
          </div>
          <div className="custom-scrollbar max-h-[600px] space-y-2 overflow-y-auto pr-1">
            {checks.map((check) => (
              <div
                key={check.id}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{check.name || check.id}</span>
                  <span className="text-[10px] text-gray-500">{check.id}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[9px] tracking-widest text-gray-500 uppercase">
                  <span>{check.scope || 'unknown'}</span>
                  {check.kind && <span>{check.kind}</span>}
                  <span>{`usage ${usageByCheck[check.id] || 0}`}</span>
                </div>
              </div>
            ))}
            {checks.length === 0 && (
              <div className="text-[11px] text-gray-500">No checks loaded.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
