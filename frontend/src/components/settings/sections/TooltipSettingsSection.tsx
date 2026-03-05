import { useRef, useState } from 'react';
import { Check, Eye, EyeOff, MousePointerClick, Server } from 'lucide-react';
import { useTooltipSettings, TOOLTIP_STYLES } from '../../../hooks/useTooltipSettings';
import { FormToggle } from '../common/FormToggle';
import { HUDTooltip } from '../../HUDTooltip';
import { SectionCard } from '../../../app/pages/templates/EmptyPage';

// ── Sample data ────────────────────────────────────────────────────────────

const PREVIEW_SAMPLES = [
  {
    title: 'COMPUTE031',
    subtitle: 'Node',
    status: 'CRIT' as const,
    enclosure: 'BullSequana X410 · 1U Twin CPU',
    icon: Server,
    checkSummary: { ok: 3, warn: 1, crit: 1 },
    details: [{ label: 'Location', value: 'RACK U08 · S1', italic: true }],
    reasons: [
      { label: 'IPMI temperature high', severity: 'CRIT' as const },
      { label: 'IPMI fan speed state', severity: 'WARN' as const },
    ],
    metrics: { temp: 47.2, tempWarn: 38, tempCrit: 45, power: 312, powerMax: 350 },
  },
  {
    title: 'COMPUTE125',
    subtitle: 'Node',
    status: 'WARN' as const,
    enclosure: 'BullSequana X410 · 1U Twin CPU',
    icon: Server,
    checkSummary: { ok: 4, warn: 1, crit: 0 },
    details: [{ label: 'Location', value: 'RACK U14 · S2', italic: true }],
    reasons: [{ label: 'IPMI temperature high', severity: 'WARN' as const }],
    metrics: { temp: 39.8, tempWarn: 38, tempCrit: 45, power: 285, powerMax: 350 },
  },
  {
    title: 'COMPUTE042',
    subtitle: 'Node',
    status: 'OK' as const,
    enclosure: 'BullSequana X410 · 1U Twin CPU',
    icon: Server,
    checkSummary: { ok: 5, warn: 0, crit: 0 },
    details: [{ label: 'Location', value: 'RACK U12 · S1', italic: true }],
    reasons: [],
    metrics: { temp: 27.4, tempWarn: 38, tempCrit: 45, power: 167, powerMax: 350 },
  },
];

// ── Live preview ───────────────────────────────────────────────────────────

const SAMPLE_LABELS = ['CRIT', 'WARN', 'OK'] as const;
const SAMPLE_COLORS: Record<string, string> = {
  CRIT: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  WARN: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  OK: 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400',
};
const INACTIVE =
  'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700';

const TooltipPreviewButton = () => {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const sample = PREVIEW_SAMPLES[sampleIdx];

  const handleToggle = () => {
    if (!pinned && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Position tooltip above-left of the button so it doesn't fly off screen
      setMousePos({ x: rect.left, y: rect.top - 10 });
    }
    setPinned((p) => !p);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Live preview</p>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
          {pinned
            ? 'Switch states while the tooltip stays visible'
            : 'Click to pin the tooltip and inspect each state'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* State switcher */}
        {SAMPLE_LABELS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setSampleIdx(i)}
            className={`rounded-lg px-2 py-1 text-[10px] font-bold tracking-wide uppercase transition-all ${
              sampleIdx === i ? SAMPLE_COLORS[s] : INACTIVE
            }`}
          >
            {s}
          </button>
        ))}

        {/* Toggle button */}
        <button
          ref={btnRef}
          type="button"
          onClick={handleToggle}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            pinned
              ? 'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
              : 'border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20'
          }`}
        >
          {pinned ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {pinned ? 'Close' : 'Preview'}
        </button>
      </div>

      {pinned && <HUDTooltip {...sample} mousePos={mousePos} />}
    </div>
  );
};

// ── Main section ───────────────────────────────────────────────────────────

export const TooltipSettingsSection = () => {
  const { style, aura, setStyle, setAura } = useTooltipSettings();
  const sorted = [...TOOLTIP_STYLES].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <SectionCard
      title="Tooltip style"
      desc="Applies to all tooltips across Rackscope (nodes, devices, racks, PDUs…)"
      icon={MousePointerClick}
      iconColor="text-brand-500"
      iconBg="bg-brand-50 dark:bg-brand-500/10"
    >
      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStyle(s.id)}
            className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all ${
              style === s.id
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-transparent bg-gray-100 hover:border-gray-300 dark:bg-gray-800/50 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.label}</span>
              {style === s.id && <Check className="text-brand-500 mt-0.5 h-3.5 w-3.5 shrink-0" />}
            </div>
            {s.id === 'tinted' && (
              <span className="self-start rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 uppercase dark:bg-gray-700 dark:text-gray-400">
                default
              </span>
            )}
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.desc}</p>
          </button>
        ))}
      </div>

      {/* Live preview */}
      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <TooltipPreviewButton />
      </div>

      {/* Aura toggle */}
      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <FormToggle
          label="Color aura"
          description="Glow shadow around the tooltip matching the alert severity (amber for WARN, red for CRIT)"
          checked={aura}
          onChange={setAura}
        />
      </div>
    </SectionCard>
  );
};
