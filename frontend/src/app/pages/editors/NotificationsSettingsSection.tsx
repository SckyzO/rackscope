import { useState, useCallback } from 'react';
import { Play } from 'lucide-react';
import { FormRow } from '../../components/forms/FormRow';
import { ToggleSwitch } from '../../components/forms/ToggleSwitch';
import { SelectInput } from '../../components/ui/SelectInput';
import { StepperInput } from '../../components/forms/StepperInput';
import { PageActionButton } from '../../components/PageActionButton';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { AlertBanner } from '../../components/ui/AlertBanner';
import {
  loadSoundSettings,
  saveSoundSettings,
  SOUND_PRESETS,
  playSound,
  type SoundAlertSettings,
  type SoundPreset,
} from '../../lib/soundAlerts';
import { useSettingsConfig } from '../../../components/settings/useSettingsConfig';
import type { ConfigDraft } from '../../../components/settings/useSettingsConfig';

const SOUND_OPTIONS = [
  { value: 'none', label: 'None (silent)' },
  ...Object.entries(SOUND_PRESETS).map(([id, p]) => ({ value: id, label: p.name })),
];

const VISIBILITY_OPTIONS = [
  { value: 'always', label: 'Always' },
  { value: 'hidden-only', label: 'Tab in background only' },
  { value: 'visible-only', label: 'Tab in foreground only' },
];

const SoundRow = ({
  label,
  description,
  tooltip,
  soundKey,
  settings,
  update,
  previewing,
  preview,
}: {
  label: string;
  description: string | undefined;
  tooltip?: string;
  soundKey: 'critSound' | 'warnSound';
  settings: SoundAlertSettings;
  update: <K extends keyof SoundAlertSettings>(key: K, value: SoundAlertSettings[K]) => void;
  previewing: string | null;
  preview: (preset: SoundPreset) => void;
}) => (
  <div className="py-3">
    <FormRow label={label} description={description} tooltip={tooltip}>
      <div className="flex items-center gap-2">
        <SelectInput
          value={settings[soundKey]}
          onChange={(v) => update(soundKey, v as SoundPreset | 'none')}
          options={SOUND_OPTIONS}
        />
        {settings[soundKey] !== 'none' && (
          <PageActionButton
            icon={Play}
            onClick={() => preview(settings[soundKey] as SoundPreset)}
            disabled={previewing !== null}
            title="Preview this sound"
          >
            {previewing === settings[soundKey] ? '…' : 'Test'}
          </PageActionButton>
        )}
      </div>
    </FormRow>
  </div>
);

export const NotificationsSettingsSection = () => {
  const { draft, setDraft } = useSettingsConfig();
  const [settings, setSettings] = useState<SoundAlertSettings>(() => loadSoundSettings());
  const [previewing, setPreviewing] = useState<string | null>(null);

  const update = useCallback(
    <K extends keyof SoundAlertSettings>(key: K, value: SoundAlertSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSoundSettings(next);
        return next;
      });
    },
    []
  );

  const updateDraft = (section: keyof ConfigDraft, field: string, value: string | number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [section]: { ...prev[section], [field]: value } };
    });
  };

  const preview = async (preset: SoundPreset) => {
    if (previewing) return;
    setPreviewing(preset);
    try {
      await playSound(preset, settings.volume / 100);
    } finally {
      setPreviewing(null);
    }
  };

  if (!draft) return null;

  return (
    <div className="space-y-6">
      {/* ── 1. Sound alerts ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <FormRow
          label="Enable sound alerts"
          description="Play a sound when new Critical or Warning alerts arrive — fires in sync with toast notifications"
          tooltip="Play an audio alert when new CRIT or WARN notifications arrive. Requires browser audio permission."
        >
          <ToggleSwitch
            checked={settings.enabled}
            onChange={() => update('enabled', !settings.enabled)}
          />
        </FormRow>
      </div>

      {settings.enabled && (
        <>
          <AlertBanner variant="info">
            Browsers require a user interaction before playing audio. Click any Test button once to
            unlock sounds for this session.
          </AlertBanner>

          {/* ── 2. Sound pickers ────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <SectionLabel>Sounds</SectionLabel>
            </div>
            <div className="divide-y divide-gray-100 px-4 dark:divide-gray-800">
              <SoundRow
                label="Critical sound"
                description={
                  settings.critSound !== 'none'
                    ? SOUND_PRESETS[settings.critSound as SoundPreset]?.description
                    : 'No sound'
                }
                tooltip="Audio clip played for CRIT-level alerts."
                soundKey="critSound"
                settings={settings}
                update={update}
                previewing={previewing}
                preview={preview}
              />
              <SoundRow
                label="Warning sound"
                description={
                  settings.warnSound !== 'none'
                    ? SOUND_PRESETS[settings.warnSound as SoundPreset]?.description
                    : 'No sound'
                }
                tooltip="Audio clip played for WARN-level alerts. Can differ from the critical sound to distinguish severity by ear."
                soundKey="warnSound"
                settings={settings}
                update={update}
                previewing={previewing}
                preview={preview}
              />

              <div className="py-3">
                <FormRow
                  label="Volume"
                  description="Alert sound volume"
                  tooltip="Alert sound volume (0–100), independent from system volume."
                >
                  <StepperInput
                    value={settings.volume}
                    onChange={(v) => update('volume', v)}
                    min={0}
                    max={100}
                    step={10}
                    unit="%"
                    className="w-28"
                  />
                </FormRow>
              </div>
            </div>
          </div>

          {/* ── 3. Behaviour ────────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <SectionLabel>Behaviour</SectionLabel>
            </div>
            <div className="divide-y divide-gray-100 px-4 dark:divide-gray-800">
              <div className="py-3">
                <FormRow
                  label="Play when"
                  description="Control when sounds fire relative to tab focus"
                  tooltip="Control when sounds fire: always, only when tab is focused, or only when tab is in background."
                >
                  <SelectInput
                    value={settings.visibility}
                    onChange={(v) => update('visibility', v as SoundAlertSettings['visibility'])}
                    options={VISIBILITY_OPTIONS}
                  />
                </FormRow>
              </div>
            </div>
          </div>

          {/* ── 4. Preview all ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3">
              <SectionLabel>Preview all sounds</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(SOUND_PRESETS) as [SoundPreset, { name: string }][]).map(
                ([id, p]) => (
                  <PageActionButton
                    key={id}
                    icon={Play}
                    onClick={() => preview(id)}
                    disabled={previewing !== null}
                  >
                    {previewing === id ? 'Playing…' : p.name}
                  </PageActionButton>
                )
              )}
            </div>
          </div>
        </>
      )}

      {/* ── 5. Visual notifications (toast popups) ─────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <SectionLabel>Visual notifications (toast popups)</SectionLabel>
        </div>
        <div className="divide-y divide-gray-100 px-4 dark:divide-gray-800">
          <div className="py-3">
            <FormRow
              label="Position"
              description="Where toasts appear on screen"
              tooltip="Screen corner where toast notifications appear. Top-right is standard."
            >
              <SelectInput
                value={draft.features.toast_position}
                onChange={(v) => updateDraft('features', 'toast_position', v)}
                options={[
                  { value: 'bottom-right', label: 'Bottom right' },
                  { value: 'top-right', label: 'Top right' },
                ]}
              />
            </FormRow>
          </div>
          <div className="py-3">
            <FormRow
              label="Display duration"
              description="How long each toast stays visible"
              tooltip="Seconds each toast stays visible before auto-dismissing. Set to 0 to require manual dismissal."
            >
              <StepperInput
                value={Number(draft.features.toast_duration_seconds)}
                onChange={(v) => updateDraft('features', 'toast_duration_seconds', String(v))}
                min={3}
                max={60}
                step={1}
                unit="s"
                className="w-28"
              />
            </FormRow>
          </div>
          <div className="py-3">
            <FormRow
              label="Stack threshold"
              description="Max toasts shown simultaneously"
              tooltip="Maximum toasts shown simultaneously. Older ones are dismissed when new ones exceed this limit."
            >
              <StepperInput
                value={Number(draft.features.toast_stack_threshold)}
                onChange={(v) => updateDraft('features', 'toast_stack_threshold', String(v))}
                min={1}
                max={20}
                step={1}
                className="w-28"
              />
            </FormRow>
          </div>
        </div>
      </div>
    </div>
  );
};
