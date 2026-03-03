/**
 * StatefulSaveButton — save button with 5 visual states.
 *
 * States:
 *   idle    → "Save Changes" (brand, no pulse)
 *   dirty   → "Save Changes" (brand + animate-pulse — signals unsaved changes)
 *   saving  → "Saving…" (brand dimmed + spinner)
 *   saved   → "Saved" (green + check — auto-resets via parent after 2–3s)
 *   error   → "Error" (red + alert icon)
 *
 * Usage:
 *   <StatefulSaveButton state={isDirty ? 'dirty' : 'idle'} onClick={handleSave} />
 *   <StatefulSaveButton state="saving" onClick={handleSave} label="Save config" />
 */

import { Save, Loader2, Check, AlertCircle } from 'lucide-react';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const STATE_CONFIG: Record<
  SaveState,
  { label: string; icon: typeof Save; cls: string; spin?: boolean }
> = {
  idle: {
    label: 'Save Changes',
    icon: Save,
    cls: 'bg-brand-500 hover:bg-brand-600 text-white',
  },
  dirty: {
    label: 'Save Changes',
    icon: Save,
    cls: 'bg-brand-500 hover:bg-brand-600 text-white animate-pulse',
  },
  saving: {
    label: 'Saving…',
    icon: Loader2,
    cls: 'bg-brand-500 text-white opacity-70 cursor-not-allowed',
    spin: true,
  },
  saved: {
    label: 'Saved',
    icon: Check,
    cls: 'bg-green-500 text-white cursor-default',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    cls: 'bg-red-500 text-white',
  },
};

export const StatefulSaveButton = ({
  state,
  onClick,
  label,
  savedLabel,
}: {
  state: SaveState;
  onClick: () => void;
  /** Override the idle/dirty label (default: "Save Changes") */
  label?: string;
  /** Override the saved label (default: "Saved") */
  savedLabel?: string;
}) => {
  const cfg = { ...STATE_CONFIG[state] };
  if (label && (state === 'idle' || state === 'dirty')) cfg.label = label;
  if (savedLabel && state === 'saved') cfg.label = savedLabel;

  const Icon = cfg.icon;

  return (
    <button
      type="button"
      onClick={state === 'saving' || state === 'saved' ? undefined : onClick}
      disabled={state === 'saving' || state === 'saved'}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed ${cfg.cls}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${cfg.spin ? 'animate-spin' : ''}`} />
      {cfg.label}
    </button>
  );
};
