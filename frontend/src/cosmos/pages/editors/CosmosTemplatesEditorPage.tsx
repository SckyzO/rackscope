import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import yaml from 'js-yaml';
import { Layers, Server, Plus, Save, Check, AlertCircle, Loader2, LayoutGrid } from 'lucide-react';
import { api } from '../../../services/api';
import type { DeviceTemplate, RackTemplate } from '../../../types';

// ─── Module-level sub-components ────────────────────────────────────────────

type KindToggleProps = {
  value: 'device' | 'rack';
  onChange: (v: 'device' | 'rack') => void;
};

const KindToggle = ({ value, onChange }: KindToggleProps) => (
  <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-800">
    {(['device', 'rack'] as const).map((k) => (
      <button
        key={k}
        onClick={() => onChange(k)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
          value === k
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
      >
        {k === 'device' ? (
          <Server className="h-3.5 w-3.5" />
        ) : (
          <LayoutGrid className="h-3.5 w-3.5" />
        )}
        {k}
      </button>
    ))}
  </div>
);

type TemplateListItemProps = {
  id: string;
  name: string;
  sub: string;
  active: boolean;
  onClick: () => void;
};

const TemplateListItem = ({ id, name, sub, active, onClick }: TemplateListItemProps) => (
  <button
    onClick={onClick}
    className={`group flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
      active
        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
    }`}
  >
    <span className="truncate text-xs font-semibold">{name}</span>
    <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">{id}</span>
    <span className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</span>
  </button>
);

type MetaRowProps = { label: string; value: string };

const MetaRow = ({ label, value }: MetaRowProps) => (
  <div className="flex flex-col gap-0.5">
    <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
      {label}
    </p>
    <p className="truncate font-mono text-xs text-gray-700 dark:text-gray-300">{value}</p>
  </div>
);

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_DEVICE_TEMPLATE = {
  id: 'new-device',
  name: 'New Device',
  type: 'server',
  u_height: 1,
  layout: { type: 'grid', rows: 1, cols: 1, matrix: [[1]] },
};

const DEFAULT_RACK_TEMPLATE = {
  id: 'new-rack',
  name: 'New Rack',
  u_height: 42,
  infrastructure: { components: [] },
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ─── Main component ──────────────────────────────────────────────────────────

export const CosmosTemplatesEditorPage: React.FC = () => {
  const [kind, setKind] = useState<'device' | 'rack'>('device');
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const catalog = await api.getCatalog();
      setDeviceTemplates(catalog.device_templates || []);
      setRackTemplates(catalog.rack_templates || []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const templates = kind === 'device' ? deviceTemplates : rackTemplates;

  const selectedTemplate = templates.find((t) => t.id === selectedId) ?? null;

  const selectTemplate = useCallback(
    (id: string) => {
      setSelectedId(id);
      setIsNew(false);
      const tpl = (kind === 'device' ? deviceTemplates : rackTemplates).find((t) => t.id === id);
      if (tpl) {
        setEditorContent(yaml.dump(tpl, { indent: 2, lineWidth: 120 }));
      }
      setSaveStatus('idle');
      setSaveError(null);
    },
    [kind, deviceTemplates, rackTemplates]
  );

  const handleKindChange = (next: 'device' | 'rack') => {
    setKind(next);
    setSelectedId(null);
    setEditorContent('');
    setIsNew(false);
    setSaveStatus('idle');
    setSaveError(null);
  };

  const handleNewTemplate = () => {
    const stub = kind === 'device' ? DEFAULT_DEVICE_TEMPLATE : DEFAULT_RACK_TEMPLATE;
    setEditorContent(yaml.dump(stub, { indent: 2, lineWidth: 120 }));
    setSelectedId(null);
    setIsNew(true);
    setSaveStatus('idle');
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editorContent.trim()) return;
    setSaveStatus('saving');
    setSaveError(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = yaml.load(editorContent) as Record<string, unknown>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'YAML parse error';
      setSaveError(`YAML error: ${msg}`);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      return;
    }

    try {
      await api.validateTemplate({ kind, template: parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Validation failed';
      setSaveError(`Validation: ${msg}`);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      return;
    }

    try {
      if (isNew) {
        await api.createTemplate({ kind, template: parsed });
      } else {
        await api.updateTemplate({ kind, template: parsed });
      }
      setSaveStatus('saved');
      setIsNew(false);
      await loadCatalog();
      const newId = parsed.id as string | undefined;
      if (newId) setSelectedId(newId);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveError(msg);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  const getSaveButtonContent = () => {
    if (saveStatus === 'saving')
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      );
    if (saveStatus === 'saved')
      return (
        <>
          <Check className="h-4 w-4" />
          <span>Saved</span>
        </>
      );
    if (saveStatus === 'error')
      return (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Error</span>
        </>
      );
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

  const deviceMeta = selectedTemplate as DeviceTemplate | null;
  const rackMeta = selectedTemplate as RackTemplate | null;

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-50 dark:bg-brand-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Layers className="text-brand-500 h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Templates</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage device and rack hardware templates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <KindToggle value={kind} onChange={handleKindChange} />
          <button
            onClick={handleNewTemplate}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || (!selectedId && !isNew)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-60 ${getSaveButtonStyle()}`}
          >
            {getSaveButtonContent()}
          </button>
        </div>
      </div>

      {/* Error banners */}
      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
        </div>
      )}
      {saveError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-500/20 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Save failed</p>
            <p className="mt-0.5 font-mono text-xs text-red-600 dark:text-red-500">{saveError}</p>
          </div>
        </div>
      )}

      {/* Three-column layout */}
      <div className="flex flex-1 gap-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Left: template list */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              {kind === 'device' ? 'Device Templates' : 'Rack Templates'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : templates.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No templates found</p>
            ) : (
              templates.map((tpl) => (
                <TemplateListItem
                  key={tpl.id}
                  id={tpl.id}
                  name={tpl.name}
                  sub={
                    kind === 'device'
                      ? `${(tpl as DeviceTemplate).type} · ${tpl.u_height}U`
                      : `${tpl.u_height}U`
                  }
                  active={selectedId === tpl.id}
                  onClick={() => selectTemplate(tpl.id)}
                />
              ))
            )}
            {isNew && (
              <TemplateListItem
                id="new"
                name="New Template *"
                sub="unsaved"
                active={true}
                onClick={() => {}}
              />
            )}
          </div>

          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Center: Monaco editor */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-[#1e1e1e]">
          {selectedId || isNew ? (
            <Editor
              height="100%"
              defaultLanguage="yaml"
              theme="vs-dark"
              value={editorContent}
              onChange={(val) => setEditorContent(val ?? '')}
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
              <p className="text-sm text-gray-500">Select a template or create a new one</p>
            </div>
          )}
        </div>

        {/* Right: metadata */}
        <div className="flex w-[200px] shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Metadata
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedTemplate ? (
              <div className="space-y-4">
                <MetaRow label="ID" value={selectedTemplate.id} />
                <MetaRow label="Name" value={selectedTemplate.name} />
                <MetaRow label="Height" value={`${selectedTemplate.u_height}U`} />
                {kind === 'device' && deviceMeta && (
                  <>
                    <MetaRow label="Type" value={deviceMeta.type} />
                    {deviceMeta.layout && (
                      <MetaRow
                        label="Layout"
                        value={`${deviceMeta.layout.rows}×${deviceMeta.layout.cols}`}
                      />
                    )}
                    {(deviceMeta.checks?.length ?? 0) > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                          Checks
                        </p>
                        <div className="space-y-1">
                          {(deviceMeta.checks ?? []).map((c) => (
                            <p
                              key={c}
                              className="truncate rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            >
                              {c}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {kind === 'rack' && rackMeta && (
                  <MetaRow
                    label="Components"
                    value={String(
                      (rackMeta.infrastructure?.components?.length ?? 0) +
                        (rackMeta.infrastructure?.rack_components?.length ?? 0)
                    )}
                  />
                )}
              </div>
            ) : isNew ? (
              <p className="text-xs text-gray-400">Fill in the YAML editor to create a template.</p>
            ) : (
              <p className="text-xs text-gray-400">No template selected.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
