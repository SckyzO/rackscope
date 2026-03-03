import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  SEVERITY_KEYS,
  DEFAULT_SEVERITY_LABELS,
  loadSeverityLabels,
  saveSeverityLabels,
  type SeverityKey,
} from '../../lib/severityLabels';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { StatusPill } from '../../components/ui/StatusPill';

const INPUT_CLS =
  'focus:border-brand-500 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';

export const SeverityLabelsSettingsSection = () => {
  const [labels, setLabels] = useState(() => loadSeverityLabels());
  const [saved, setSaved] = useState(false);

  const update = (key: SeverityKey, value: string) => {
    setLabels((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    saveSeverityLabels(labels);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    setLabels({ ...DEFAULT_SEVERITY_LABELS });
    saveSeverityLabels({ ...DEFAULT_SEVERITY_LABELS });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <SectionLabel>Severity display labels</SectionLabel>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            These labels are display-only — they do not affect data, API responses, or YAML configuration.
          </p>
        </div>
        <div className="divide-y divide-gray-100 px-4 dark:divide-gray-800">
          {SEVERITY_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-4 py-3">
              <div className="w-24 shrink-0">
                <StatusPill status={key} size="sm" />
              </div>
              <input
                type="text"
                value={labels[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={DEFAULT_SEVERITY_LABELS[key]}
                className={INPUT_CLS}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <button
            onClick={reset}
            className="text-xs text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            Reset to defaults
          </button>
          <button
            onClick={save}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-brand-500 hover:bg-brand-600 text-white'
            }`}
          >
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : 'Save labels'}
          </button>
        </div>
      </div>
    </div>
  );
};
