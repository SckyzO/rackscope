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

      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-6">
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
      </div>
    </div>
  );
};
