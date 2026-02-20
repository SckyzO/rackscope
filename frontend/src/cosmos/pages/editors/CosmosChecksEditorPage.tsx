import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileText,
  Save,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { CheckDefinition, ChecksLibrary } from '../../../types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SCOPE_COLORS: Record<string, string> = {
  node: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  chassis: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  rack: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
};

const KIND_COLORS: Record<string, string> = {
  server: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  storage: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400',
  switch: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
  pdu: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  cooling: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
};

const ScopeBadge = ({ scope }: { scope: string }) => (
  <span
    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${SCOPE_COLORS[scope] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
  >
    {scope}
  </span>
);

const KindBadge = ({ kind }: { kind: string }) => (
  <span
    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_COLORS[kind] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
  >
    {kind}
  </span>
);

const CheckPreviewCard = ({ check }: { check: CheckDefinition }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
    <p className="mb-2 font-mono text-xs font-semibold text-gray-900 dark:text-white">{check.id}</p>
    {check.name && (
      <p className="mb-2 truncate text-[11px] text-gray-500 dark:text-gray-400">{check.name}</p>
    )}
    <div className="flex flex-wrap gap-1.5">
      <ScopeBadge scope={check.scope} />
      {check.kind && <KindBadge kind={check.kind} />}
    </div>
  </div>
);

const FileListItem = ({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
      active
        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
    }`}
  >
    <FileText className="h-3.5 w-3.5 shrink-0" />
    <span className="flex-1 truncate font-mono text-xs">{name}</span>
    {active && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
  </button>
);

export const CosmosChecksEditorPage: React.FC = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [previewChecks, setPreviewChecks] = useState<CheckDefinition[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadFiles = async () => {
      setLoadingFiles(true);
      try {
        const data = await api.getChecksFiles();
        const fileList = Array.isArray(data) ? (data as string[]) : [];
        setFiles(fileList);
        if (fileList.length > 0) {
          setSelectedFile(fileList[0]);
        }
      } catch (err) {
        console.error('Failed to load checks files:', err);
      } finally {
        setLoadingFiles(false);
      }
    };
    loadFiles();
  }, []);

  useEffect(() => {
    if (!selectedFile) return;

    const loadFileContent = async () => {
      setLoadingContent(true);
      setErrorMsg(null);
      try {
        const data = await api.getChecksFile(selectedFile);
        const fileContent =
          typeof data === 'string' ? data : ((data as { content?: string })?.content ?? '');
        setContent(fileContent);
      } catch (err) {
        console.error('Failed to load checks file:', err);
        setContent('');
      } finally {
        setLoadingContent(false);
      }
    };
    loadFileContent();
  }, [selectedFile]);

  const loadPreviewChecks = useCallback(async () => {
    try {
      const library: ChecksLibrary = await api.getChecks();
      setPreviewChecks(library.checks ?? []);
    } catch {
      setPreviewChecks([]);
    }
  }, []);

  useEffect(() => {
    loadPreviewChecks();
  }, [loadPreviewChecks]);

  const handleSave = async () => {
    if (!selectedFile || !content) return;

    setSaveStatus('saving');
    setErrorMsg(null);

    try {
      await api.updateChecksFile(selectedFile, content);
      setSaveStatus('saved');
      await loadPreviewChecks();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save file';
      setErrorMsg(message);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  const getSaveButtonContent = () => {
    if (saveStatus === 'saving') {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <>
          <Check className="h-4 w-4" />
          <span>Saved</span>
        </>
      );
    }
    if (saveStatus === 'error') {
      return (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Error</span>
        </>
      );
    }
    return (
      <>
        <Save className="h-4 w-4" />
        <span>Save</span>
      </>
    );
  };

  const getSaveButtonStyle = () => {
    if (saveStatus === 'saved') return 'bg-green-500 hover:bg-green-600 text-white';
    if (saveStatus === 'error') return 'bg-red-500 hover:bg-red-600 text-white';
    return 'bg-brand-500 hover:bg-brand-600 text-white';
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-50 dark:bg-brand-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <ShieldCheck className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Checks Library</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Edit health check definitions (YAML)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedFile && (
            <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              {selectedFile}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !selectedFile}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-60 ${getSaveButtonStyle()}`}
          >
            {getSaveButtonContent()}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Save failed</p>
            <p className="mt-0.5 font-mono text-xs text-red-600 dark:text-red-500">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Three-column layout */}
      <div className="flex flex-1 gap-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Left panel: file list */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Files
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : files.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No files found</p>
            ) : (
              files.map((name) => (
                <FileListItem
                  key={name}
                  name={name}
                  active={selectedFile === name}
                  onClick={() => setSelectedFile(name)}
                />
              ))
            )}
          </div>

          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Center: Monaco editor */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-[#1e1e1e]">
          {loadingContent && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1e1e1e]/80">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}
          {selectedFile ? (
            <Editor
              height="100%"
              defaultLanguage="yaml"
              theme="vs-dark"
              value={content}
              onChange={(val) => setContent(val ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
                tabSize: 2,
                scrollBeyondLastLine: false,
                renderLineHighlight: 'all',
                lineNumbers: 'on',
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-gray-500">Select a file to edit</p>
            </div>
          )}
        </div>

        {/* Right panel: checks preview */}
        <div className="flex w-[240px] shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Parsed Checks
            </p>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {previewChecks.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No checks loaded</p>
            ) : (
              previewChecks.map((check) => <CheckPreviewCard key={check.id} check={check} />)
            )}
          </div>

          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {previewChecks.length} check{previewChecks.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
