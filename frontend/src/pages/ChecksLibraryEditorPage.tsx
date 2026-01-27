import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type ChecksFile = {
  name: string;
  path: string;
  relative: string;
};

export const ChecksLibraryEditorPage = () => {
  const [files, setFiles] = useState<ChecksFile[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    api.getChecksFiles()
      .then((data) => {
        if (!active) return;
        setFiles(data.files || []);
        if (data.files?.length) {
          setSelectedFile(data.files[0].name);
        }
      })
      .catch((err) => setError(err?.message || 'Failed to load files'));
    api.getChecks()
      .then((data) => {
        if (!active) return;
        setChecks(data?.checks || []);
      })
      .catch(console.error);
    api.getCatalog()
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
    setStatus('loading');
    api.getChecksFile(selectedFile)
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
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Failed to save');
    }
  };

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-gray-500">Checks</div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Library Editor</h1>
          <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
            Edit checks library files
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || status === 'saving'}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
            isDirty
              ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/25'
              : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
          }`}
        >
          {status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : 'Save'}
        </button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-6">
        <aside className="bg-rack-panel border border-rack-border rounded-3xl p-4 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Files</div>
          <div className="space-y-1">
            {files.map((file) => (
              <button
                key={file.name}
                type="button"
                onClick={() => setSelectedFile(file.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-mono ${
                  selectedFile === file.name
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                    : 'text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>
        </aside>

        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">YAML</div>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            className="w-full min-h-[520px] rounded-2xl bg-black/30 border border-white/10 p-4 text-[11px] font-mono text-gray-200"
          />
          {error && (
            <pre className="text-[11px] text-status-crit whitespace-pre-wrap bg-black/30 border border-white/10 rounded-xl p-3">
              {error}
            </pre>
          )}
        </section>

        <aside className="bg-rack-panel border border-rack-border rounded-3xl p-4 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Checks</div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {checks.map((check) => (
              <div key={check.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{check.name || check.id}</span>
                  <span className="text-[10px] text-gray-500">{check.id}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-widest text-gray-500">
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
