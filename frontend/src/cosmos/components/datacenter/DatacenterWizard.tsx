/**
 * DatacenterWizard — 4-step guided DC setup
 *
 * Steps: Site → Room → First Aisle (skippable) → Summary
 * Uses the "With Description" stepper from the UI Library.
 * Auto-starts on first install (no sites), accessible via "New Datacenter" button.
 */

import { useState, useEffect, type ReactNode } from 'react';
import {
  Check,
  Building2,
  DoorOpen,
  AlignJustify,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronRight,
  X,
} from 'lucide-react';
import { api } from '../../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardData = {
  site: { name: string; id: string };
  room: { name: string; id: string; description: string };
  aisle: { enabled: boolean; name: string; id: string };
};

interface DatacenterWizardProps {
  /** Called with the created siteId on success — parent should reload + drill down */
  onComplete: (siteId: string) => void;
  /** Called if user explicitly dismisses (only shown when sites already exist) */
  onDismiss?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// ── Stepper primitives — "With Description" variant from UI Library ───────────

const stepState = (idx: number, current: number): 'completed' | 'current' | 'upcoming' =>
  idx < current ? 'completed' : idx === current ? 'current' : 'upcoming';

const StepCircle = ({ state, num }: { state: string; num: number }) => {
  if (state === 'completed')
    return (
      <div className="bg-success-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white">
        <Check className="h-4 w-4" />
      </div>
    );
  if (state === 'current')
    return (
      <div className="bg-brand-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
        {num}
      </div>
    );
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-sm font-semibold text-gray-400 dark:border-gray-700">
      {num}
    </div>
  );
};

const ConnectorH = ({ state }: { state: string }) => (
  <div
    className={`mt-4 h-0.5 flex-1 transition-colors ${
      state === 'completed' ? 'bg-success-500' : 'bg-gray-200 dark:bg-gray-700'
    }`}
  />
);

// ── Form field helpers ────────────────────────────────────────────────────────

const inputCls =
  'focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';

const Field = ({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
  </div>
);

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Site', desc: 'Define your datacenter' },
  { label: 'Room', desc: 'Add the first room' },
  { label: 'Aisle', desc: 'Add the first aisle' },
  { label: 'Summary', desc: 'Review and create' },
];

// ── Step 1 — Site ─────────────────────────────────────────────────────────────

const StepSite = ({
  data,
  onChange,
}: {
  data: WizardData['site'];
  onChange: (d: WizardData['site']) => void;
}) => {
  const [idManual, setIdManual] = useState(false);

  const handleName = (name: string) => {
    onChange({ name, id: idManual ? data.id : slugify(name) });
  };
  const handleId = (id: string) => {
    setIdManual(true);
    onChange({ ...data, id });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 dark:border-brand-700/30 dark:bg-brand-500/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/20">
          <Building2 className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Create a site</p>
          <p className="text-xs text-brand-600/70 dark:text-brand-400/70">
            A site represents a physical datacenter location
          </p>
        </div>
      </div>

      <Field label="Site Name" required hint="e.g. Paris DC1, New York HQ, Lab East">
        <input
          autoFocus
          type="text"
          placeholder="My Datacenter"
          value={data.name}
          onChange={(e) => handleName(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field
        label="Site ID"
        hint="Auto-generated. Used internally and in file paths — lowercase letters, numbers and dashes only."
      >
        <input
          type="text"
          placeholder="my-datacenter"
          value={data.id}
          onChange={(e) => handleId(e.target.value)}
          className={`${inputCls} font-mono text-xs`}
        />
      </Field>
    </div>
  );
};

// ── Step 2 — Room ─────────────────────────────────────────────────────────────

const StepRoom = ({
  data,
  onChange,
}: {
  data: WizardData['room'];
  onChange: (d: WizardData['room']) => void;
}) => {
  const [idManual, setIdManual] = useState(false);

  const handleName = (name: string) => {
    onChange({ ...data, name, id: idManual ? data.id : slugify(name) });
  };
  const handleId = (id: string) => {
    setIdManual(true);
    onChange({ ...data, id });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
          <DoorOpen className="h-4.5 w-4.5 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create a room</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Rooms contain aisles and racks. You can add more rooms later.
          </p>
        </div>
      </div>

      <Field label="Room Name" required hint="e.g. Server Room A, Zone 1, Main Hall">
        <input
          autoFocus
          type="text"
          placeholder="Server Room A"
          value={data.name}
          onChange={(e) => handleName(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Room ID" hint="Auto-generated from name.">
        <input
          type="text"
          placeholder="server-room-a"
          value={data.id}
          onChange={(e) => handleId(e.target.value)}
          className={`${inputCls} font-mono text-xs`}
        />
      </Field>

      <Field label="Description" hint="Optional — displayed in the room view.">
        <input
          type="text"
          placeholder="Main compute floor, 200 racks"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className={inputCls}
        />
      </Field>
    </div>
  );
};

// ── Step 3 — Aisle ────────────────────────────────────────────────────────────

const StepAisle = ({
  data,
  onChange,
}: {
  data: WizardData['aisle'];
  onChange: (d: WizardData['aisle']) => void;
}) => {
  const [idManual, setIdManual] = useState(false);

  const handleName = (name: string) => {
    onChange({ ...data, name, id: idManual ? data.id : slugify(name) });
  };
  const handleId = (id: string) => {
    setIdManual(true);
    onChange({ ...data, id });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
          <AlignJustify className="h-4.5 w-4.5 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Create the first aisle
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Aisles organize racks in rows. This step is optional.
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add an aisle now</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            You can add aisles and racks from the editor at any time
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...data, enabled: !data.enabled })}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            data.enabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              data.enabled ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      {data.enabled && (
        <>
          <Field label="Aisle Name" required hint="e.g. Row A, Aisle 1, North Row">
            <input
              autoFocus
              type="text"
              placeholder="Row A"
              value={data.name}
              onChange={(e) => handleName(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Aisle ID" hint="Auto-generated from name.">
            <input
              type="text"
              placeholder="row-a"
              value={data.id}
              onChange={(e) => handleId(e.target.value)}
              className={`${inputCls} font-mono text-xs`}
            />
          </Field>
        </>
      )}
    </div>
  );
};

// ── Step 4 — Summary ──────────────────────────────────────────────────────────

const StepSummary = ({
  data,
  error,
}: {
  data: WizardData;
  error: string | null;
}) => (
  <div className="space-y-5">
    <p className="text-sm text-gray-500 dark:text-gray-400">
      The following will be created in your topology:
    </p>

    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
      {/* Site */}
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
          <Building2 className="h-4 w-4 text-brand-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{data.site.name}</p>
          <p className="font-mono text-[11px] text-gray-400 dark:text-gray-500">{data.site.id}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          site
        </span>
      </div>

      {/* Room */}
      <div className="ml-4 mt-3 flex items-start gap-3 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          <DoorOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{data.room.name}</p>
          <p className="font-mono text-[11px] text-gray-400 dark:text-gray-500">{data.room.id}</p>
          {data.room.description && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{data.room.description}</p>
          )}
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          room
        </span>
      </div>

      {/* Aisle (if enabled) */}
      {data.aisle.enabled && data.aisle.name && (
        <div className="ml-8 mt-3 flex items-start gap-3 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <AlignJustify className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{data.aisle.name}</p>
            <p className="font-mono text-[11px] text-gray-400 dark:text-gray-500">{data.aisle.id}</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            aisle
          </span>
        </div>
      )}

      {data.aisle.enabled && !data.aisle.name && (
        <p className="ml-12 mt-2 text-xs text-amber-500 dark:text-amber-400">
          ⚠ Aisle name is empty — will be skipped
        </p>
      )}
    </div>

    {error && (
      <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )}
  </div>
);

// ── Main Wizard component ─────────────────────────────────────────────────────

export const DatacenterWizard = ({ onComplete, onDismiss }: DatacenterWizardProps) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>({
    site: { name: '', id: '' },
    room: { name: '', id: '', description: '' },
    aisle: { enabled: true, name: '', id: '' },
  });

  // Reset error when step changes
  useEffect(() => {
    setError(null);
  }, [step]);

  // ── Validation per step
  const canAdvance = () => {
    if (step === 0) return data.site.name.trim() !== '' && data.site.id.trim() !== '';
    if (step === 1) return data.room.name.trim() !== '' && data.room.id.trim() !== '';
    if (step === 2) return !data.aisle.enabled || data.aisle.name.trim() !== '';
    return true;
  };

  // ── Navigation
  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  // ── Create
  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Create site
      await api.createSite({ name: data.site.name.trim(), id: data.site.id.trim() });

      // 2. Create room
      await api.createRoom(data.site.id.trim(), {
        name: data.room.name.trim(),
        id: data.room.id.trim(),
        description: data.room.description.trim() || null,
      });

      // 3. Create aisle (if enabled and has a name)
      if (data.aisle.enabled && data.aisle.name.trim()) {
        await api.createRoomAisles(data.room.id.trim(), [
          { name: data.aisle.name.trim(), id: data.aisle.id.trim() || undefined },
        ]);
      }

      onComplete(data.site.id.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create datacenter');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">

        {/* Top band */}
        <div className="border-b border-gray-100 bg-gray-50 px-8 pt-7 pb-6 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                New Datacenter Setup
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Configure your infrastructure in a few steps
              </p>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                title="Close wizard"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Stepper — "With Description" variant */}
          <div className="flex items-start">
            {STEPS.map((s, idx) => {
              const state = stepState(idx, step);
              return (
                <div key={s.label} className="flex flex-1 items-start">
                  <div className="flex flex-col items-center gap-2">
                    <StepCircle state={state} num={idx + 1} />
                    <div className="text-center">
                      <div
                        className={`text-xs font-semibold ${
                          state === 'current'
                            ? 'text-brand-500'
                            : state === 'completed'
                            ? 'text-success-500'
                            : 'text-gray-400'
                        }`}
                      >
                        {s.label}
                      </div>
                      <div className="mt-0.5 hidden text-[10px] text-gray-400 sm:block dark:text-gray-500">
                        {s.desc}
                      </div>
                    </div>
                  </div>
                  {idx < STEPS.length - 1 && <ConnectorH state={state} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-7">
          {step === 0 && (
            <StepSite
              data={data.site}
              onChange={(site) => setData((d) => ({ ...d, site }))}
            />
          )}
          {step === 1 && (
            <StepRoom
              data={data.room}
              onChange={(room) => setData((d) => ({ ...d, room }))}
            />
          )}
          {step === 2 && (
            <StepAisle
              data={data.aisle}
              onChange={(aisle) => setData((d) => ({ ...d, aisle }))}
            />
          )}
          {step === 3 && <StepSummary data={data} error={error} />}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-gray-100 px-8 py-5 dark:border-gray-800">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex items-center gap-1.5 mr-2">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === step
                      ? 'w-4 bg-brand-500'
                      : idx < step
                      ? 'w-1.5 bg-success-500'
                      : 'w-1.5 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => void handleCreate()}
                disabled={submitting}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {submitting ? 'Creating…' : 'Create Datacenter'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* First-install hint */}
      {!onDismiss && (
        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">
          No datacenter configured yet. Complete the setup to get started.
        </p>
      )}
    </div>
  );
};
