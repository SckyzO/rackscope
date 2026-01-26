import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import type { RackTemplate } from '../types';

type RackComponentDraft = {
  id: string;
  name: string;
  type: string;
  location: 'u-mount' | 'side-left' | 'side-right' | 'top' | 'bottom';
  u_position: string;
  u_height: string;
};

type RackDraft = {
  id: string;
  name: string;
  u_height: string;
  front_components: RackComponentDraft[];
  rear_components: RackComponentDraft[];
  side_components: RackComponentDraft[];
};

const emptyComponent = (): RackComponentDraft => ({
  id: '',
  name: '',
  type: 'power',
  location: 'u-mount',
  u_position: '1',
  u_height: '1',
});

const defaultDraft: RackDraft = {
  id: '',
  name: '',
  u_height: '42',
  front_components: [],
  rear_components: [],
  side_components: [],
};

const parsePositiveInt = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const renderComponentLabel = (comp: RackComponentDraft) => comp.id || comp.name || comp.type || 'component';

export const TemplatesRackEditorPage = () => {
  const [draft, setDraft] = useState<RackDraft>(defaultDraft);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showYaml, setShowYaml] = useState(false);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchParams] = useSearchParams();
  const unitHeight = 24;
  const minPreviewHeight = 240;

  const previewHeight = useMemo(() => {
    const uHeight = parsePositiveInt(draft.u_height, 42);
    return Math.max(uHeight * unitHeight, minPreviewHeight);
  }, [draft.u_height]);

  const previewUCount = useMemo(() => parsePositiveInt(draft.u_height, 42), [draft.u_height]);

  useEffect(() => {
    let active = true;
    api.getCatalog()
      .then((catalog) => {
        if (!active) return;
        setRackTemplates(catalog.rack_templates || []);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id || rackTemplates.length === 0) return;
    const selected = rackTemplates.find((t) => t.id === id);
    if (!selected) return;
    setSelectedTemplateId(id);
    loadTemplate(selected);
  }, [rackTemplates, searchParams]);

  const mapComponentDraft = (comp: any, rackHeight: number): RackComponentDraft => ({
    id: comp?.id || '',
    name: comp?.name || '',
    type: comp?.type || 'other',
    location: comp?.location || 'u-mount',
    u_position: String(comp?.u_position || 1),
    u_height: String(comp?.u_height || (comp?.location?.startsWith('side') ? rackHeight : 1)),
  });

  const loadTemplate = (template: RackTemplate) => {
    const rackHeight = template.u_height || 42;
    setDraft({
      id: template.id,
      name: template.name,
      u_height: String(rackHeight),
      front_components: (template.infrastructure?.front_components || []).map((comp) => mapComponentDraft(comp, rackHeight)),
      rear_components: (template.infrastructure?.rear_components || []).map((comp) => mapComponentDraft(comp, rackHeight)),
      side_components: (template.infrastructure?.side_components || []).map((comp) => mapComponentDraft(comp, rackHeight)),
    });
    setIsEditing(true);
    setStatus('idle');
    setError(null);
  };

  const yamlPreview = useMemo(() => {
    const uHeight = parsePositiveInt(draft.u_height, 42);
    const mapComponent = (comp: RackComponentDraft) => ({
      id: comp.id,
      name: comp.name,
      type: comp.type,
      location: comp.location,
      u_position: parsePositiveInt(comp.u_position, 1),
      u_height: parsePositiveInt(comp.u_height, 1),
    });
    const template: Record<string, any> = {
      id: draft.id.trim() || 'rack-template-id',
      name: draft.name.trim() || 'Rack Template',
      u_height: uHeight,
      infrastructure: {
        front_components: draft.front_components.map(mapComponent),
        rear_components: draft.rear_components.map(mapComponent),
        side_components: draft.side_components.map(mapComponent),
      },
    };
    return `rack_templates:\n  - ${JSON.stringify(template, null, 2).replace(/\n/g, '\n    ')}`;
  }, [draft]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const uHeight = parsePositiveInt(draft.u_height, 0);
    if (!draft.id.trim()) errors.push('Template ID is required.');
    if (!draft.name.trim()) errors.push('Name is required.');
    if (!Number.isFinite(uHeight) || uHeight <= 0) errors.push('U height must be greater than 0.');
    if (!isEditing && rackTemplates.some((t) => t.id === draft.id.trim())) {
      errors.push('Template ID already exists.');
    }

    const validateComponents = (items: RackComponentDraft[], label: string) => {
      items.forEach((comp) => {
        const pos = parsePositiveInt(comp.u_position, 1);
        const height = parsePositiveInt(comp.u_height, 1);
        if (pos <= 0 || height <= 0) {
          errors.push(`${label}: u_position and u_height must be > 0.`);
          return;
        }
        if (uHeight && pos + height - 1 > uHeight) {
          errors.push(`${label}: component exceeds rack height.`);
        }
      });
    };

    validateComponents(draft.front_components, 'Front components');
    validateComponents(draft.rear_components, 'Rear components');
    validateComponents(draft.side_components, 'Side components');
    return errors;
  }, [draft, rackTemplates, isEditing]);

  const canSave = validationErrors.length === 0;

  const handleSave = async () => {
    if (!canSave) return;
    setStatus('saving');
    setError(null);
    try {
      const uHeight = parsePositiveInt(draft.u_height, 42);
      const mapComponent = (comp: RackComponentDraft) => ({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        location: comp.location,
        u_position: parsePositiveInt(comp.u_position, 1),
        u_height: parsePositiveInt(comp.u_height, 1),
      });
      const template = {
        id: draft.id.trim(),
        name: draft.name.trim(),
        u_height: uHeight,
        infrastructure: {
          front_components: draft.front_components.map(mapComponent),
          rear_components: draft.rear_components.map(mapComponent),
          side_components: draft.side_components.map(mapComponent),
        },
      };
      if (isEditing) {
        await api.updateTemplate({ kind: 'rack', template });
      } else {
        await api.createTemplate({ kind: 'rack', template });
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
      if (!isEditing) {
        setDraft(defaultDraft);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
      setStatus('error');
    }
  };

  const renderComponentRows = (
    items: RackComponentDraft[],
    onChange: (next: RackComponentDraft[]) => void,
    label: string,
    allowSide: boolean,
  ) => (
    <div className="space-y-2">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">{label}</div>
      {items.map((comp, idx) => (
        <div key={`${label}-${comp.id || idx}`} className="grid grid-cols-6 gap-2">
          <input
            value={comp.id}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], id: e.target.value };
              onChange(next);
            }}
            className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
            placeholder="id"
          />
          <input
            value={comp.name}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], name: e.target.value };
              onChange(next);
            }}
            className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
            placeholder="name"
          />
          <select
            value={comp.type}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], type: e.target.value };
              onChange(next);
            }}
            className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
          >
            <option value="power">power</option>
            <option value="cooling">cooling</option>
            <option value="management">management</option>
            <option value="network">network</option>
            <option value="other">other</option>
          </select>
          <select
            value={comp.location}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], location: e.target.value as RackComponentDraft['location'] };
              onChange(next);
            }}
            className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
          >
            <option value="u-mount">u-mount</option>
            {allowSide && <option value="side-left">side-left</option>}
            {allowSide && <option value="side-right">side-right</option>}
            <option value="top">top</option>
            <option value="bottom">bottom</option>
          </select>
          <input
            value={comp.u_position}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], u_position: e.target.value };
              onChange(next);
            }}
            className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
            placeholder="u_pos"
          />
          <input
            value={comp.u_height}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], u_height: e.target.value };
              onChange(next);
            }}
            className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-xs text-gray-200"
            placeholder="u_height"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, emptyComponent()])}
        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[var(--color-accent)]"
      >
        + Add component
      </button>
    </div>
  );

  const renderRackPreview = (label: string, components: RackComponentDraft[]) => (
    <div className="space-y-2">
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">{label}</div>
      <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
        <div className="flex gap-2">
          <div className="w-6 text-[9px] font-mono text-gray-600 flex flex-col" style={{ height: `${previewHeight}px` }}>
            {Array.from({ length: previewUCount }).map((_, idx) => (
              <div key={idx} className="flex-1 flex items-center justify-center border-b border-white/10">
                <span>{idx + 1}</span>
              </div>
            ))}
          </div>
          <div className="relative rounded-xl border border-white/10 bg-black/40 flex-1" style={{ height: `${previewHeight}px` }}>
            <div className="absolute left-0 top-0 bottom-0 w-5 border-r border-white/10 bg-black/60 flex items-center justify-center text-[8px] text-gray-500 font-mono">
              L
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-5 border-l border-white/10 bg-black/60 flex items-center justify-center text-[8px] text-gray-500 font-mono">
              R
            </div>
            {draft.side_components.map((comp, idx) => {
              const uPos = parsePositiveInt(comp.u_position, 1);
              const uHeight = parsePositiveInt(comp.u_height, 1);
              const height = uHeight * unitHeight;
              const bottom = (uPos - 1) * unitHeight;
              const isRight = comp.location === 'side-right';
              return (
                <div
                  key={`${comp.id}-${idx}`}
                  className={`absolute ${isRight ? 'right-0' : 'left-0'} w-5 rounded-sm bg-black/60 border border-white/10`}
                  style={{ height: `${height}px`, bottom: `${bottom}px` }}
                  title={renderComponentLabel(comp)}
                />
              );
            })}
            {components.map((comp, idx) => {
              const uPos = parsePositiveInt(comp.u_position, 1);
              const uHeight = parsePositiveInt(comp.u_height, 1);
              const height = uHeight * unitHeight;
              const bottom = (uPos - 1) * unitHeight;
              return (
                <div
                  key={`${comp.id}-${idx}`}
                  className="absolute left-7 right-7 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-gray-300 flex items-center justify-between px-2"
                  style={{ height: `${height}px`, bottom: `${bottom}px` }}
                >
                  <span className="truncate">{renderComponentLabel(comp)}</span>
                  <span className="text-gray-500">{comp.type}</span>
                </div>
              );
            })}
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
    </div>
  );

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-gray-500">Templates</div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Rack Editor</h1>
          <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
            Rack template (basic)
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
            }}
            className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[var(--color-border)] text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            New Template
          </button>
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_720px] gap-6">
        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-200">Rack Template</h2>
          <label className="text-xs text-gray-400">
            Load existing
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedTemplateId(nextId);
                const selected = rackTemplates.find((t) => t.id === nextId);
                if (selected) {
                  loadTemplate(selected);
                } else {
                  setIsEditing(false);
                  setDraft(defaultDraft);
                }
              }}
              className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
            >
              <option value="">New rack template</option>
              {rackTemplates.map((template) => (
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
              className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
              placeholder="my-rack-42u"
            />
          </label>
          <label className="text-xs text-gray-400">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
              placeholder="My Rack"
            />
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

          {renderComponentRows(draft.front_components, (next) => setDraft((prev) => ({ ...prev, front_components: next })), 'Front components', false)}
          {renderComponentRows(draft.rear_components, (next) => setDraft((prev) => ({ ...prev, rear_components: next })), 'Rear components', false)}
          {renderComponentRows(draft.side_components, (next) => setDraft((prev) => ({ ...prev, side_components: next })), 'Side components', true)}

          {validationErrors.length > 0 && (
            <div className="text-[11px] text-status-warn space-y-1">
              {validationErrors.slice(0, 3).map((message) => (
                <div key={message}>{message}</div>
              ))}
              {validationErrors.length > 3 && (
                <div>{`+${validationErrors.length - 3} more`}</div>
              )}
            </div>
          )}
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
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-200 mb-4">Rack Preview</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {renderRackPreview('Front', draft.front_components)}
                {renderRackPreview('Rear', draft.rear_components)}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
