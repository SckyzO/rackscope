import { createPortal } from 'react-dom';
import { useRef, useState } from 'react';
import { Check, MousePointerClick, Server } from 'lucide-react';
import { useTooltipSettings, TOOLTIP_STYLES } from '@src/hooks/useTooltipSettings';
import type { TooltipStyle } from '@src/hooks/useTooltipSettings';
import { FormToggle } from '../common/FormToggle';
import { HUDTooltipCard } from '@src/components/HUDTooltip';
import { StatusPill } from '@app/components/ui/StatusPill';
import { SectionCard } from '@app/pages/templates/EmptyPage';

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

// Mirrors the internal STYLE_WIDTH constant in HUDTooltip.tsx
const STYLE_WIDTH: Record<TooltipStyle, string> = {
  compact: 'w-80',
  glass: 'w-80',
  terminal: 'w-72',
  split: 'w-80',
  tinted: 'w-80',
  ultracompact: 'w-56',
  border: 'w-80',
  notification: 'w-80',
};

// ── Portal preview ─────────────────────────────────────────────────────────

type PreviewState = {
  styleId: TooltipStyle;
  sampleIdx: number;
  mousePos: { x: number; y: number };
};

const TooltipPreview = ({ preview }: { preview: PreviewState }) => {
  const { aura } = useTooltipSettings();
  const sample = PREVIEW_SAMPLES[preview.sampleIdx];
  const { x, y } = preview.mousePos;
  const showBelow = y < 400;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: showBelow ? `${y + 12}px` : `${y - 12}px`,
        left: `${x}px`,
        transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className={STYLE_WIDTH[preview.styleId]}>
        <HUDTooltipCard style={preview.styleId} aura={aura} {...sample} />
      </div>
    </div>,
    document.body
  );
};

// ── Main section ───────────────────────────────────────────────────────────

export const TooltipSettingsSection = () => {
  const { style, aura, setStyle, setAura } = useTooltipSettings();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sorted = [...TOOLTIP_STYLES].sort((a, b) => a.label.localeCompare(b.label));

  const showPreview = (styleId: TooltipStyle, sampleIdx: number, e: React.MouseEvent) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPreview({ styleId, sampleIdx, mousePos: { x: e.clientX, y: e.clientY } });
  };

  const updatePos = (e: React.MouseEvent) => {
    setPreview((p) => (p ? { ...p, mousePos: { x: e.clientX, y: e.clientY } } : null));
  };

  const hidePreview = () => {
    // Small delay so moving between pills in the same card doesn't flash
    hideTimer.current = setTimeout(() => setPreview(null), 60);
  };

  return (
    <SectionCard
      title="Tooltip style"
      desc="Applies to all tooltips across Rackscope (nodes, devices, racks, PDUs…)"
      icon={MousePointerClick}
      iconColor="text-brand-500"
      iconBg="bg-brand-50 dark:bg-brand-500/10"
    >
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStyle(s.id)}
            className={`relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all ${
              style === s.id
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-transparent bg-gray-100 hover:border-gray-300 dark:bg-gray-800/50 dark:hover:border-gray-600'
            }`}
          >
            {/* Badge top-right when active */}
            {style === s.id && (
              <div className="bg-brand-500 absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full">
                <Check className="h-2.5 w-2.5 text-white" />
              </div>
            )}

            {/* Label */}
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.label}</span>

            {/* Description */}
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.desc}</p>

            {/* Status pills — hover to preview that style */}
            <div className="flex gap-1.5 pt-0.5">
              {PREVIEW_SAMPLES.map((sample, idx) => (
                <div
                  key={idx}
                  onMouseEnter={(e) => showPreview(s.id, idx, e)}
                  onMouseMove={updatePos}
                  onMouseLeave={hidePreview}
                  onClick={(e) => e.stopPropagation()}
                >
                  <StatusPill status={sample.status} size="sm" />
                </div>
              ))}
            </div>
          </button>
        ))}
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

      {preview && <TooltipPreview preview={preview} />}
    </SectionCard>
  );
};
