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

const SOUND_OPTIONS = [
  { value: 'none', label: 'None (silent)' },
  ...Object.entries(SOUND_PRESETS).map(([id, p]) => ({
    value: id,
    label: p.name,
  })),
];

const VISIBILITY_OPTIONS = [
  { value: 'always', label: 'Always' },
  { value: 'hidden-only', label: 'Tab in background only' },
  { value: 'visible-only', label: 'Tab in foreground only' },
];

export const NotificationsSettingsSection = () => {
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

  const preview = async (preset: SoundPreset) => {
    if (previewing) return;
    setPreviewing(preset);
    try {
      await playSound(preset, settings.volume / 100);
    } finally {
      setPreviewing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <FormRow
          label="Enable sound alerts"
          description="Play a sound when new CRIT or WARN alerts are detected"
        >
          <ToggleSwitch checked={settings.enabled} onChange={() => update('enabled', !settings.enabled)} />
        </FormRow>
      </div>

      {settings.enabled && (
        <>
          {/* Browser permission note */}
          <AlertBanner variant="info">
            Browsers require a user interaction before playing audio. Click any Preview button once to
            unlock sounds.
          </AlertBanner>

          {/* Sound pickers */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <SectionLabel>Sound configuration</SectionLabel>
            </div>
            <div className="divide-y divide-gray-100 px-4 dark:divide-gray-800">
              {/* WARN sound */}
              <div className="py-3">
                <FormRow
                  label="WARN sound"
                  description={
                    settings.warnSound !== 'none'
                      ? SOUND_PRESETS[settings.warnSound as SoundPreset]?.description
                      : 'No sound'
                  }
                >
                  <div className="flex items-center gap-2">
                    <SelectInput
                      value={settings.warnSound}
                      onChange={(v) => update('warnSound', v as SoundPreset | 'none')}
                      options={SOUND_OPTIONS}
                    />
                    {settings.warnSound !== 'none' && (
                      <PageActionButton
                        icon={Play}
                        onClick={() => preview(settings.warnSound as SoundPreset)}
                        disabled={previewing !== null}
                        title="Preview this sound"
                      >
                        {previewing === settings.warnSound ? '…' : 'Test'}
                      </PageActionButton>
                    )}
                  </div>
                </FormRow>
              </div>

              {/* CRIT sound */}
              <div className="py-3">
                <FormRow
                  label="CRIT sound"
                  description={
                    settings.critSound !== 'none'
                      ? SOUND_PRESETS[settings.critSound as SoundPreset]?.description
                      : 'No sound'
                  }
                >
                  <div className="flex items-center gap-2">
                    <SelectInput
                      value={settings.critSound}
                      onChange={(v) => update('critSound', v as SoundPreset | 'none')}
                      options={SOUND_OPTIONS}
                    />
                    {settings.critSound !== 'none' && (
                      <PageActionButton
                        icon={Play}
                        onClick={() => preview(settings.critSound as SoundPreset)}
                        disabled={previewing !== null}
                        title="Preview this sound"
                      >
                        {previewing === settings.critSound ? '…' : 'Test'}
                      </PageActionButton>
                    )}
                  </div>
                </FormRow>
              </div>

              {/* Volume */}
              <div className="py-3">
                <FormRow label="Volume" description="Alert sound volume">
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

              {/* Visibility */}
              <div className="py-3">
                <FormRow
                  label="Play when"
                  description="Control when sounds fire relative to tab focus"
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

          {/* Preview all */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3">
              <SectionLabel>Preview all sounds</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(SOUND_PRESETS) as [SoundPreset, { name: string }][]).map(([id, p]) => (
                <PageActionButton
                  key={id}
                  icon={Play}
                  onClick={() => preview(id)}
                  disabled={previewing !== null}
                >
                  {previewing === id ? 'Playing…' : p.name}
                </PageActionButton>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
