/**
 * HUDTooltip — 6 tooltip styles for the rack visualizer.
 *
 * Styles (configurable in Settings > Views):
 *   tinted        — tinted header sections (default)
 *   compact       — 2px top bar, split temp/power columns
 *   border        — top+left colored border only
 *   notification  — notification card style
 *   terminal      — monospace HPC style
 *   ultracompact  — 220px cluster view
 */

import { createPortal } from 'react-dom';
import { Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTooltipSettings } from '../hooks/useTooltipSettings';
import type { TooltipStyle } from '../hooks/useTooltipSettings';

// ── Shared types ────────────────────────────────────────────────────────────────

export type TooltipReason = {
  label: string;
  severity?: string;
}

export type HUDTooltipMetrics = {
  temp?: number;
  tempWarn?: number;
  tempCrit?: number;
  power?: number;
  powerMax?: number;
}

export type HUDTooltipCheckSummary = {
  ok: number;
  warn: number;
  crit: number;
}

export type HUDTooltipProps = {
  title: string;
  subtitle?: string;
  status: string;
  enclosure?: string;
  icon?: LucideIcon;
  checkSummary?: HUDTooltipCheckSummary;
  details?: { label: string; value: string; italic?: boolean }[];
  reasons?: TooltipReason[];
  metrics?: HUDTooltipMetrics;
  mousePos: { x: number; y: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtPower(watts: number): string {
  return watts >= 1000 ? `${(watts / 1000).toFixed(1)} kW` : `${Math.round(watts)} W`;
}

function resolveStatus(status: string) {
  switch (status) {
    case 'OK':
      return { hex: '#22c55e', twText: 'text-status-ok', twBg: 'bg-status-ok' };
    case 'WARN':
      return { hex: '#f59e0b', twText: 'text-status-warn', twBg: 'bg-status-warn' };
    case 'CRIT':
      return { hex: '#ef4444', twText: 'text-status-crit', twBg: 'bg-status-crit' };
    default:
      return { hex: '#6b7280', twText: 'text-gray-400', twBg: 'bg-gray-600' };
  }
}

function resolveTempColor(temp: number, warn?: number, crit?: number) {
  if (crit !== undefined && temp >= crit) return resolveStatus('CRIT');
  if (warn !== undefined && temp >= warn) return resolveStatus('WARN');
  return resolveStatus('OK');
}

function tempLabel(temp: number, warn?: number, crit?: number): string | null {
  if (warn === undefined) return null;
  if (crit !== undefined && temp >= crit) return 'CRIT';
  if (temp >= warn) return 'WARN';
  return 'OK';
}

function glowShadow(status: string, hex: string, enabled: boolean): string {
  if (!enabled) return '0 4px 20px rgba(0,0,0,0.4)';
  if (status === 'CRIT') return `0 4px 18px ${hex}1a, 0 3px 8px rgba(0,0,0,0.4)`;
  if (status === 'WARN') return `0 4px 14px ${hex}12, 0 3px 8px rgba(0,0,0,0.4)`;
  return '0 4px 20px rgba(0,0,0,0.4)';
}

// ── SVG Arc Gauge ───────────────────────────────────────────────────────────────

const TempArc = ({ value, warn, crit }: { value: number; warn?: number; crit?: number }) => {
  const SIZE = 90;
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 4;
  const R = 34;
  const SW = 5;
  const R_LBL = R + SW / 2 + 9;
  const START = -135;
  const SWEEP = 270;
  const maxVal = crit ? crit * 1.15 : 60;
  const pct = value > 0 ? Math.min(1, value / maxVal) : 0;
  const { hex: fc } = value > 0 ? resolveTempColor(value, warn, crit) : { hex: '#4b5563' };
  const rad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r = R) => ({
    x: cx + r * Math.cos(rad(deg)),
    y: cy + r * Math.sin(rad(deg)),
  });
  const path = (f: number, t: number) => {
    const s = pt(f),
      e = pt(t),
      lg = t - f > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };
  const fillEnd = START + SWEEP * pct;
  const wP = warn && crit ? warn / maxVal : null;
  const cP = crit ? crit / maxVal : null;
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <path
        d={path(START, START + SWEEP)}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={SW}
        strokeLinecap="round"
      />
      {value > 0 && pct > 0.01 && (
        <path
          d={path(START, fillEnd)}
          fill="none"
          stroke={fc}
          strokeWidth={SW}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${fc}88)` }}
        />
      )}
      {wP !== null && warn && (
        <>
          <circle
            cx={pt(START + SWEEP * wP).x}
            cy={pt(START + SWEEP * wP).y}
            r={SW / 2 + 0.5}
            fill="#f59e0b"
            opacity={0.65}
          />
          <text
            x={pt(START + SWEEP * wP, R_LBL).x}
            y={pt(START + SWEEP * wP, R_LBL).y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="6.5"
            fontWeight="700"
            fontFamily="monospace"
            fill="#d97706"
            opacity="0.9"
          >
            {warn}°
          </text>
        </>
      )}
      {cP !== null && cP < 1 && crit && (
        <>
          <circle
            cx={pt(START + SWEEP * cP).x}
            cy={pt(START + SWEEP * cP).y}
            r={SW / 2 + 0.5}
            fill="#ef4444"
            opacity={0.65}
          />
          <text
            x={pt(START + SWEEP * cP, R_LBL).x}
            y={pt(START + SWEEP * cP, R_LBL).y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="6.5"
            fontWeight="700"
            fontFamily="monospace"
            fill="#dc2626"
            opacity="0.9"
          >
            {crit}°
          </text>
        </>
      )}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="15"
        fontWeight="900"
        fontFamily="monospace"
        fill={fc}
      >
        {value > 0 ? value.toFixed(1) : '--'}
      </text>
      <text
        x={cx}
        y={cy + 9}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fill="rgba(255,255,255,0.3)"
        fontFamily="monospace"
      >
        °C
      </text>
    </svg>
  );
};

// ── Power bar ───────────────────────────────────────────────────────────────────

const _PowerBar = ({ watts, max }: { watts: number; max: number }) => {
  const p = Math.min(100, Math.round((watts / max) * 100));
  const c = p >= 90 ? 'bg-status-crit' : p >= 70 ? 'bg-status-warn' : 'bg-yellow-400/60';
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`absolute inset-y-0 left-0 rounded-full ${c}`} style={{ width: `${p}%` }} />
      </div>
      <span className="shrink-0 font-mono text-[9px] text-gray-500">{p}%</span>
    </div>
  );
};

// ── Shared footer ───────────────────────────────────────────────────────────────

const _Footer = ({ details, checkSummary }: Pick<HUDTooltipProps, 'details' | 'checkSummary'>) => {
  const hasDetails = (details?.length ?? 0) > 0;
  const hasChecks = checkSummary && checkSummary.ok + checkSummary.warn + checkSummary.crit > 0;
  if (!hasDetails && !hasChecks) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5">
      {hasDetails && (
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
          {(details ?? []).map((d, i) => (
            <span key={i} className={`text-[11px] text-gray-500 ${d.italic ? 'font-mono' : ''}`}>
              {d.value}
            </span>
          ))}
        </div>
      )}
      {hasChecks && checkSummary && (
        <div className="flex shrink-0 items-center gap-2.5 text-[11px] font-bold">
          {checkSummary.ok > 0 && (
            <span className="text-status-ok flex items-center gap-0.5">✓{checkSummary.ok}</span>
          )}
          {checkSummary.warn > 0 && (
            <span className="text-status-warn flex items-center gap-0.5">⚠{checkSummary.warn}</span>
          )}
          {checkSummary.crit > 0 && (
            <span className="text-status-crit flex items-center gap-0.5">✕{checkSummary.crit}</span>
          )}
        </div>
      )}
    </div>
  );
};

// Suppress noUnusedLocals — these components are reserved for future style variants
void _PowerBar;
void _Footer;

// ── Shared alerts list ──────────────────────────────────────────────────────────

const AlertList = ({ reasons }: { reasons: TooltipReason[] }) => (
  <div className="space-y-[3px]">
    {reasons.map((r, i) => (
      <div
        key={i}
        className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
          r.severity === 'CRIT'
            ? 'bg-status-crit/[0.09]'
            : r.severity === 'WARN'
              ? 'bg-status-warn/[0.09]'
              : 'bg-white/[0.03]'
        }`}
      >
        <div
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            r.severity === 'CRIT'
              ? 'bg-status-crit animate-pulse'
              : r.severity === 'WARN'
                ? 'bg-status-warn'
                : 'bg-gray-600'
          }`}
        />
        <span className="min-w-0 flex-1 truncate text-[11px] text-gray-200">{r.label}</span>
        {r.severity && (
          <span
            className={`shrink-0 text-[9px] font-black tracking-wider uppercase ${
              r.severity === 'CRIT'
                ? 'text-status-crit'
                : r.severity === 'WARN'
                  ? 'text-status-warn'
                  : 'text-gray-500'
            }`}
          >
            {r.severity}
          </span>
        )}
      </div>
    ))}
  </div>
);

const TintedCard = ({
  title,
  subtitle,
  status,
  enclosure,
  icon: _Icon,
  checkSummary,
  details,
  reasons,
  metrics,
  aura,
}: Omit<HUDTooltipProps, 'mousePos'> & { aura: boolean; mousePos?: { x: number; y: number } }) => {
  const st = resolveStatus(status);
  const tv = metrics?.temp;
  const tw = metrics?.tempWarn;
  const tc = metrics?.tempCrit;
  const tRes = tv !== undefined && tv > 0 ? resolveTempColor(tv, tw, tc) : null;
  const tLbl = tv !== undefined && tv > 0 ? tempLabel(tv, tw, tc) : null;
  const loc = details?.find((d) => d.italic)?.value;
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/[0.05] bg-[#0a0a12]"
      style={{ boxShadow: glowShadow(status, st.hex, aura) }}
    >
      <div
        className="px-3.5 pt-3.5 pb-3"
        style={{ background: `linear-gradient(180deg,${st.hex}12 0%,transparent 100%)` }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="text-[8px] font-bold tracking-[0.15em] text-gray-600 uppercase">
            {subtitle ?? 'Node'}
          </div>
          <div
            className={`rounded-[6px] border px-2 py-[3px] text-[9px] font-black tracking-[0.12em] uppercase ${st.twText}`}
            style={{ borderColor: `${st.hex}4d`, background: 'rgba(255,255,255,0.04)' }}
          >
            {status}
          </div>
        </div>
        <div className="text-[20px] leading-none font-black tracking-[-0.03em] text-white uppercase">
          {title}
        </div>
        {enclosure && <div className="mt-[3px] text-[10px] text-gray-600">{enclosure}</div>}
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 pb-3.5">
        {(reasons?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-[3px] border-b border-white/[0.04] pb-2.5">
            {(reasons ?? []).map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-[8px] px-2 py-[5px] ${r.severity === 'CRIT' ? 'bg-status-crit/[0.07]' : 'bg-status-warn/[0.06]'}`}
              >
                <div
                  className={`h-5 w-[2px] shrink-0 rounded-[1px] ${r.severity === 'CRIT' ? 'bg-status-crit' : 'bg-status-warn'}`}
                />
                <span className="min-w-0 flex-1 truncate text-[10px] text-gray-200">{r.label}</span>
                <span
                  className={`shrink-0 text-[8px] font-black tracking-[0.1em] uppercase ${r.severity === 'CRIT' ? 'text-status-crit' : 'text-status-warn'}`}
                >
                  {r.severity}
                </span>
              </div>
            ))}
          </div>
        )}
        {(tv !== undefined || (metrics?.power ?? 0) > 0) && (
          <div className="flex gap-1">
            {tv !== undefined && (
              <div className="flex-1 rounded-[10px] bg-white/[0.03] p-2.5">
                <div className="mb-1 text-[8px] font-bold tracking-[0.15em] text-gray-600 uppercase">
                  Thermal
                </div>
                <div
                  className={`font-mono text-[19px] leading-none font-black ${tRes?.twText ?? 'text-gray-300'}`}
                >
                  {tv > 0 ? tv.toFixed(1) : '--'}
                  <span className="ml-0.5 text-[9px] font-normal text-gray-500">°C</span>
                </div>
                {tc !== undefined && tv > 0 && (
                  <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className={`h-full rounded-full ${tRes?.twBg ?? 'bg-gray-600'}`}
                      style={{ width: `${Math.min(100, Math.round((tv / tc) * 100))}%` }}
                    />
                  </div>
                )}
                {tLbl && tLbl !== 'OK' && (
                  <div
                    className={`mt-1 text-[8px] font-black tracking-[0.1em] uppercase ${tRes?.twText}`}
                  >
                    {tLbl}
                  </div>
                )}
              </div>
            )}
            {(metrics?.power ?? 0) > 0 && (
              <div className="flex-1 rounded-[10px] bg-white/[0.03] p-2.5">
                <div className="mb-1 text-[8px] font-bold tracking-[0.15em] text-gray-600 uppercase">
                  Power
                </div>
                <div className="font-mono text-[19px] leading-none font-black text-yellow-400">
                  {fmtPower(metrics?.power ?? 0)}
                </div>
                {metrics?.powerMax && metrics.powerMax > 0 && (
                  <>
                    <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-yellow-400/60"
                        style={{
                          width: `${Math.min(100, Math.round(((metrics.power ?? 0) / (metrics.powerMax ?? 1)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 font-mono text-[7px] text-gray-600">
                      {Math.round(((metrics.power ?? 0) / (metrics.powerMax ?? 1)) * 100)}% of{' '}
                      {fmtPower(metrics.powerMax)}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {(loc ?? (checkSummary && checkSummary.ok + checkSummary.warn + checkSummary.crit > 0)) && (
          <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
            <span className="font-mono text-[9px] text-gray-600">{loc ?? ''}</span>
            {checkSummary && (
              <div className="flex gap-2 text-[10px] font-bold">
                {checkSummary.warn > 0 && (
                  <span className="text-status-warn">⚠{checkSummary.warn}</span>
                )}
                {checkSummary.crit > 0 && (
                  <span className="text-status-crit">✕{checkSummary.crit}</span>
                )}
                {checkSummary.ok > 0 && <span className="text-status-ok">✓{checkSummary.ok}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CompactCard = ({
  title,
  subtitle,
  status,
  enclosure,
  icon: Icon,
  checkSummary,
  details,
  reasons,
  metrics,
  aura,
}: Omit<HUDTooltipProps, 'mousePos'> & { aura: boolean; mousePos?: { x: number; y: number } }) => {
  const st = resolveStatus(status);
  const tv = metrics?.temp;
  const tw = metrics?.tempWarn;
  const tc = metrics?.tempCrit;
  const tRes = tv !== undefined && tv > 0 ? resolveTempColor(tv, tw, tc) : null;
  const hasAlerts = (reasons?.length ?? 0) > 0;
  const loc = details?.find((d) => d.italic)?.value;
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111118]"
      style={{ boxShadow: glowShadow(status, st.hex, aura) }}
    >
      <div
        className={`h-[2px] w-full opacity-70 ${st.twBg} ${status === 'CRIT' ? 'animate-pulse' : ''}`}
      />
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            {Icon && (
              <div className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-white/[0.05]">
                <Icon className="h-[13px] w-[13px] text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[8px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                {subtitle ?? 'Node'}
              </div>
              <div className="text-[16px] leading-tight font-black tracking-[-0.02em] text-white uppercase">
                {title}
              </div>
              {enclosure && <div className="text-[10px] text-gray-600">{enclosure}</div>}
            </div>
          </div>
          <div className={`flex shrink-0 items-center gap-[5px] ${st.twText}`}>
            <div
              className={`h-[6px] w-[6px] rounded-full ${st.twBg} ${status === 'CRIT' ? 'animate-pulse' : ''}`}
              style={{ boxShadow: `0 0 5px ${st.hex}` }}
            />
            <span className="text-[10px] font-black tracking-[0.12em] uppercase">{status}</span>
          </div>
        </div>
        <div
          className="h-px"
          style={{ background: 'linear-gradient(to right,rgba(255,255,255,0.06),transparent)' }}
        />
        {hasAlerts && (
          <>
            <AlertList reasons={reasons ?? []} />
            <div
              className="h-px"
              style={{ background: 'linear-gradient(to right,rgba(255,255,255,0.06),transparent)' }}
            />
          </>
        )}
        {(tv !== undefined || (metrics?.power ?? 0) > 0) && (
          <div className="flex items-center gap-4">
            {tv !== undefined && tv > 0 && (
              <div className={`flex items-center gap-[5px] ${tRes?.twText ?? 'text-gray-300'}`}>
                <svg
                  className="h-3 w-3 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 2a4 4 0 0 1 4 4v8a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                </svg>
                <span className="font-mono text-[15px] leading-none font-black">
                  {tv.toFixed(1)}
                  <span className="ml-0.5 text-[9px] font-normal text-gray-500">°C</span>
                </span>
              </div>
            )}
            {(metrics?.power ?? 0) > 0 && (
              <div className="flex items-center gap-[5px]">
                <Zap className="h-3 w-3 shrink-0 text-yellow-400" />
                <span className="font-mono text-[15px] leading-none font-black text-gray-200">
                  {fmtPower(metrics?.power ?? 0)}
                </span>
              </div>
            )}
          </div>
        )}
        {(loc ?? (checkSummary && checkSummary.ok + checkSummary.warn + checkSummary.crit > 0)) && (
          <div className="flex items-center justify-between border-t border-white/[0.05] pt-2">
            <span className="font-mono text-[10px] text-gray-600">{loc ?? ''}</span>
            {checkSummary && (
              <div className="flex gap-2 text-[10px] font-bold">
                {checkSummary.crit > 0 && (
                  <span className="text-status-crit">✕{checkSummary.crit}</span>
                )}
                {checkSummary.warn > 0 && (
                  <span className="text-status-warn">⚠{checkSummary.warn}</span>
                )}
                {checkSummary.ok > 0 && <span className="text-status-ok">✓{checkSummary.ok}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const GlassCard = ({
  title,
  subtitle: _subtitle,
  status,
  enclosure,
  icon: Icon,
  checkSummary,
  details,
  reasons,
  metrics,
  aura,
}: Omit<HUDTooltipProps, 'mousePos'> & { aura: boolean; mousePos?: { x: number; y: number } }) => {
  const st = resolveStatus(status);
  const tv = metrics?.temp;
  const tw = metrics?.tempWarn;
  const tc = metrics?.tempCrit;
  const tRes = tv !== undefined && tv > 0 ? resolveTempColor(tv, tw, tc) : null;
  const tLbl = tv !== undefined && tv > 0 ? tempLabel(tv, tw, tc) : null;
  const loc = details?.find((d) => d.italic)?.value;
  return (
    <div
      className="overflow-hidden rounded-[18px] border border-white/[0.05] backdrop-blur-2xl"
      style={{ background: 'rgba(15,15,25,0.96)', boxShadow: glowShadow(status, st.hex, aura) }}
    >
      <div className="px-3.5 pt-3.5 pb-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <div
                className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px]"
                style={{ background: `${st.hex}1a` }}
              >
                <Icon className={`h-[13px] w-[13px] ${st.twText}`} />
              </div>
            )}
            <div className="min-w-0 truncate text-[15px] font-black tracking-[-0.02em] text-white uppercase">
              {title}
            </div>
          </div>
          <div
            className={`flex shrink-0 items-center gap-1 rounded-full border px-[9px] py-[3px] ${st.twText}`}
            style={{ borderColor: `${st.hex}66`, background: `${st.hex}0d` }}
          >
            <div
              className={`h-[5px] w-[5px] rounded-full ${st.twBg} ${status === 'CRIT' ? 'animate-pulse' : ''}`}
            />
            <span className="text-[9px] font-black tracking-[0.1em] uppercase">{status}</span>
          </div>
        </div>
        {enclosure && <div className="pl-9 text-[10px] text-gray-600">{enclosure}</div>}
      </div>
      <div
        className="mx-3.5 h-px opacity-40"
        style={{
          background: `linear-gradient(to right,${st.hex},rgba(255,255,255,0.04),transparent)`,
        }}
      />
      <div className="flex flex-col gap-3 px-3.5 py-3">
        {(reasons?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-1">
            {(reasons ?? []).map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-[9px] border-l-2 px-2.5 py-1.5 ${r.severity === 'CRIT' ? 'bg-status-crit/[0.07]' : 'bg-status-warn/[0.07]'}`}
                style={{
                  borderLeftColor:
                    r.severity === 'CRIT' ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.4)',
                }}
              >
                <div
                  className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full text-[8px] font-black ${r.severity === 'CRIT' ? 'bg-status-crit/20 text-status-crit' : 'bg-status-warn/15 text-status-warn'}`}
                >
                  !
                </div>
                <span className="min-w-0 flex-1 truncate text-[11px] text-gray-200">{r.label}</span>
                <span
                  className={`shrink-0 text-[8px] font-black tracking-[0.1em] uppercase ${r.severity === 'CRIT' ? 'text-status-crit' : 'text-status-warn'}`}
                >
                  {r.severity}
                </span>
              </div>
            ))}
          </div>
        )}
        {(tv !== undefined || (metrics?.power ?? 0) > 0) && (
          <div className="flex gap-3">
            <div className="flex-1 rounded-[10px] border border-white/[0.05] bg-white/[0.03] p-2.5">
              <div className="mb-1 text-[8px] font-bold tracking-[0.15em] text-gray-600 uppercase">
                Thermal
              </div>
              {tv !== undefined && tv > 0 ? (
                <>
                  <div
                    className={`font-mono text-[17px] leading-none font-black ${tRes?.twText ?? 'text-gray-300'}`}
                  >
                    {tv.toFixed(1)}
                    <span className="ml-0.5 text-[9px] font-normal text-gray-500">°C</span>
                  </div>
                  {tLbl && (
                    <div
                      className={`mt-1 text-[8px] font-bold tracking-[0.1em] uppercase ${tRes?.twText}`}
                    >
                      {tLbl}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-mono text-[17px] leading-none font-black text-gray-600">
                    --<span className="ml-0.5 text-[9px] text-gray-600">°C</span>
                  </div>
                  <div className="mt-1 text-[8px] font-bold tracking-[0.1em] text-gray-700 uppercase">
                    N/A
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 rounded-[10px] border border-white/[0.05] bg-white/[0.03] p-2.5">
              <div className="mb-1 text-[8px] font-bold tracking-[0.15em] text-gray-600 uppercase">
                Power
              </div>
              {(metrics?.power ?? 0) > 0 ? (
                <>
                  <div className="font-mono text-[17px] leading-none font-black text-gray-200">
                    {fmtPower(metrics?.power ?? 0)}
                  </div>
                  {metrics?.powerMax && metrics.powerMax > 0 && (
                    <div className="mt-1 font-mono text-[7px] text-gray-600">
                      {Math.round(((metrics.power ?? 0) / (metrics.powerMax ?? 1)) * 100)}% of{' '}
                      {fmtPower(metrics.powerMax)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-mono text-[17px] leading-none font-black text-gray-600">
                    50<span className="ml-0.5 text-[9px] text-gray-600">W</span>
                  </div>
                  <div className="mt-1 text-[8px] font-bold tracking-[0.1em] text-gray-700 uppercase">
                    Standby
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {(loc ?? (checkSummary && checkSummary.ok + checkSummary.warn + checkSummary.crit > 0)) && (
          <div className="flex items-center justify-between border-t border-white/[0.05] pt-2.5">
            <span className="font-mono text-[10px] text-gray-600">{loc ?? ''}</span>
            {checkSummary && (
              <div className="flex gap-2.5 text-[10px] font-bold">
                {checkSummary.crit > 0 && (
                  <span className="text-status-crit">✕{checkSummary.crit}</span>
                )}
                {checkSummary.warn > 0 && (
                  <span className="text-status-warn">⚠{checkSummary.warn}</span>
                )}
                {checkSummary.ok > 0 && <span className="text-status-ok">✓{checkSummary.ok}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SplitCard = ({
  title,
  subtitle,
  status,
  enclosure,
  icon: _Icon,
  checkSummary,
  details,
  reasons,
  metrics,
  aura,
}: Omit<HUDTooltipProps, 'mousePos'> & { aura: boolean; mousePos?: { x: number; y: number } }) => {
  const st = resolveStatus(status);
  const tv = metrics?.temp;
  const tw = metrics?.tempWarn;
  const tc = metrics?.tempCrit;
  const tRes = tv !== undefined && tv > 0 ? resolveTempColor(tv, tw, tc) : null;
  const tLbl = tv !== undefined && tv > 0 ? tempLabel(tv, tw, tc) : null;
  const loc = details?.find((d) => d.italic)?.value;
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e0e1a]"
      style={{ boxShadow: glowShadow(status, st.hex, aura) }}
    >
      <div className="flex">
        <div className="flex flex-1 flex-col gap-2.5 border-r border-white/[0.05] p-3.5">
          <div>
            <div className="text-[8px] font-bold tracking-[0.2em] text-gray-600 uppercase">
              {subtitle ?? 'Node'}
            </div>
            <div className="mt-0.5 text-[15px] leading-tight font-black tracking-[-0.02em] text-white uppercase">
              {title}
            </div>
            {enclosure && <div className="mt-0.5 text-[9px] text-gray-600">{enclosure}</div>}
          </div>
          <div className={`flex items-center gap-[5px] ${st.twText}`}>
            <div
              className={`h-[6px] w-[6px] rounded-full ${st.twBg} ${status === 'CRIT' ? 'animate-pulse' : ''}`}
              style={{ boxShadow: `0 0 6px ${st.hex}` }}
            />
            <span className="text-[10px] font-black tracking-[0.1em] uppercase">{status}</span>
          </div>
          {(reasons?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1">
              {(reasons ?? []).map((r, i) => (
                <div
                  key={i}
                  className={`truncate rounded-[6px] px-1.5 py-1 text-[10px] ${r.severity === 'CRIT' ? 'bg-status-crit/[0.08] text-status-crit' : 'bg-status-warn/[0.07] text-status-warn'}`}
                >
                  {r.label}
                </div>
              ))}
            </div>
          )}
          {loc && <div className="font-mono text-[9px] text-gray-600">{loc}</div>}
        </div>
        <div className="flex w-[110px] shrink-0 flex-col items-center justify-center gap-1.5 px-2.5 py-3.5">
          <div className="text-[10px] font-bold tracking-[0.1em] text-gray-600 uppercase">
            Thermal
          </div>
          {tv !== undefined ? (
            <>
              <TempArc value={tv} warn={tw} crit={tc} />
              <div
                className={`text-center font-mono text-[18px] leading-none font-black ${tRes?.twText ?? 'text-gray-400'}`}
              >
                {tv > 0 ? tv.toFixed(1) : '--'}
                <span className="ml-0.5 text-[9px] font-normal text-gray-600">°C</span>
              </div>
              {tLbl && (
                <div className={`text-[8px] font-black tracking-[0.1em] uppercase ${tRes?.twText}`}>
                  {tLbl}
                </div>
              )}
            </>
          ) : (
            <div className="font-mono text-[18px] font-black text-gray-600">--</div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.04] bg-black/20 px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <Zap className="h-[11px] w-[11px] text-yellow-400" />
          <span className="font-mono text-[11px] font-black text-gray-200">
            {(metrics?.power ?? 0) > 0 ? fmtPower(metrics?.power ?? 0) : '--'}
          </span>
        </div>
        {checkSummary && checkSummary.ok + checkSummary.warn + checkSummary.crit > 0 && (
          <div className="flex gap-2 text-[9px] font-bold">
            {checkSummary.ok > 0 && <span className="text-status-ok">✓{checkSummary.ok}</span>}
            {checkSummary.warn > 0 && (
              <span className="text-status-warn">⚠{checkSummary.warn}</span>
            )}
            {checkSummary.crit > 0 && (
              <span className="text-status-crit">✕{checkSummary.crit}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// STYLE 6 — Terminal (monospace HPC style)
// ══════════════════════════════════════════════════════════════════════════════

const TerminalCard = ({
  title,
  subtitle,
  status,
  enclosure,
  checkSummary,
  details,
  reasons,
  metrics,
  aura,
}: Omit<HUDTooltipProps, 'mousePos'> & { aura: boolean; mousePos?: { x: number; y: number } }) => {
  const st = resolveStatus(status);
  const tv = metrics?.temp;
  const tw = metrics?.tempWarn;
  const tc = metrics?.tempCrit;
  const tLbl = tv !== undefined && tv > 0 ? tempLabel(tv, tw, tc) : null;
  const loc = details?.find((d) => d.italic)?.value;
  return (
    <div
      className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#050508] font-mono backdrop-blur-2xl"
      style={{ boxShadow: glowShadow(status, st.hex, aura) }}
    >
      {/* Titlebar */}
      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.04] px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </div>
        <span className="flex-1 text-center text-[10px] text-gray-600">
          node-inspector · {loc ?? subtitle ?? 'rack'}
        </span>
      </div>
      {/* Body */}
      <div className="space-y-[3px] p-3 text-[10px] leading-relaxed">
        <div>
          <span className="text-gray-600"># {subtitle ?? 'Node'}</span>
        </div>
        <div>
          <span className="text-blue-400">node</span>
          <span className="text-gray-600"> = </span>
          <span className="text-emerald-400">"{title}"</span>
        </div>
        {enclosure && (
          <div>
            <span className="text-blue-400">type</span>
            <span className="text-gray-600"> = </span>
            <span className="text-emerald-400">"{enclosure}"</span>
          </div>
        )}
        {loc && (
          <div>
            <span className="text-blue-400">location</span>
            <span className="text-gray-600"> = </span>
            <span className="text-emerald-400">"{loc}"</span>
          </div>
        )}
        <div className="pt-1">
          <span className="text-gray-600"># Status</span>
        </div>
        <div>
          <span className="text-blue-400">state</span>
          <span className="text-gray-600"> = </span>
          <span className={st.twText}>{status}</span>
        </div>
        {tv !== undefined && tv > 0 && (
          <div>
            <span className="text-blue-400">temp</span>
            <span className="text-gray-600"> = </span>
            <span
              className={
                tLbl === 'CRIT'
                  ? 'text-red-400'
                  : tLbl === 'WARN'
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
              }
            >
              {tv.toFixed(1)}
            </span>
            <span className="text-gray-600">°C</span>
            {tLbl && tLbl !== 'OK' && (
              <span className="text-gray-500">
                {' '}
                # &gt; {tLbl === 'CRIT' ? tc : tw}° {tLbl}
              </span>
            )}
          </div>
        )}
        {(metrics?.power ?? 0) > 0 && (
          <div>
            <span className="text-blue-400">power</span>
            <span className="text-gray-600"> = </span>
            <span className="text-yellow-400">{Math.round(metrics?.power ?? 0)}</span>
            <span className="text-gray-600">W</span>
          </div>
        )}
        {(reasons?.length ?? 0) > 0 && (
          <>
            <div className="pt-1">
              <span className="text-gray-600"># Alerts</span>
            </div>
            {(reasons ?? []).map((r, i) => (
              <div key={i}>
                <span className={r.severity === 'CRIT' ? 'text-red-400' : 'text-yellow-400'}>
                  !
                </span>
                <span className={r.severity === 'CRIT' ? 'text-red-300' : 'text-yellow-300'}>
                  {' '}
                  {r.label.toLowerCase().replace(/ /g, '_')}
                </span>
                <span className="text-gray-500"> [{r.severity}]</span>
              </div>
            ))}
          </>
        )}
        {checkSummary && (
          <>
            <div className="pt-1">
              <span className="text-gray-600"># Checks</span>
            </div>
            <div>
              {checkSummary.ok > 0 && (
                <span className="text-emerald-400">✓ {checkSummary.ok} ok </span>
              )}
              {checkSummary.warn > 0 && (
                <span className="text-yellow-400">⚠ {checkSummary.warn} warn </span>
              )}
              {checkSummary.crit > 0 && (
                <span className="text-red-400">✕ {checkSummary.crit} crit</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// STYLE 10 — Ultra-compact (220px cluster view)
// ══════════════════════════════════════════════════════════════════════════════

const UltraCompactCard = ({
  title,
  subtitle,
  status,
  icon: Icon,
  checkSummary,
  details,
  reasons,
  metrics,
  aura,
}: Omit<HUDTooltipProps, 'mousePos'> & { aura: boolean; mousePos?: { x: number; y: number } }) => {
  const st = resolveStatus(status);
  const tv = metrics?.temp;
  const tw = metrics?.tempWarn;
  const tc = metrics?.tempCrit;
  const tRes = tv !== undefined && tv > 0 ? resolveTempColor(tv, tw, tc) : null;
  const loc = details?.find((d) => d.italic)?.value;
  return (
    <div
      className="overflow-hidden rounded-xl border border-white/[0.06] bg-gray-950/95 backdrop-blur-2xl"
      style={{ boxShadow: glowShadow(status, st.hex, aura) }}
    >
      <div className={`h-[2px] w-full ${st.twBg} ${status === 'CRIT' ? 'animate-pulse' : ''}`} />
      <div className="space-y-2 p-3">
        {/* Compact header */}
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
              <Icon className="h-3 w-3 text-gray-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-black tracking-tight text-white uppercase">
              {title}
            </div>
            {subtitle && (
              <div className="text-[8px] tracking-wider text-gray-600 uppercase">{subtitle}</div>
            )}
          </div>
          <div
            className={`h-2 w-2 shrink-0 rounded-full ${st.twBg} ${status === 'CRIT' ? 'animate-pulse' : ''}`}
            style={{ boxShadow: `0 0 5px ${st.hex}` }}
          />
        </div>
        {/* Inline metrics */}
        {(tv !== undefined || (metrics?.power ?? 0) > 0) && (
          <div className="flex items-center gap-3">
            {tv !== undefined && tv > 0 && (
              <span
                className={`font-mono text-[12px] font-bold ${tRes?.twText ?? 'text-gray-300'}`}
              >
                🌡 {tv.toFixed(1)}°
              </span>
            )}
            {(metrics?.power ?? 0) > 0 && (
              <span className="font-mono text-[12px] font-bold text-gray-200">
                ⚡ {fmtPower(metrics?.power ?? 0)}
              </span>
            )}
          </div>
        )}
        {/* Alert tags */}
        {(reasons?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {(reasons ?? []).slice(0, 2).map((r, i) => (
              <span
                key={i}
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${r.severity === 'CRIT' ? 'bg-status-crit/10 text-status-crit' : 'bg-status-warn/10 text-status-warn'}`}
              >
                {r.label.split(' ').slice(0, 3).join(' ')}
              </span>
            ))}
          </div>
        )}
        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.04] pt-1.5">
          <span className="font-mono text-[9px] text-gray-600">{loc ?? ''}</span>
          {checkSummary && checkSummary.ok + checkSummary.warn + checkSummary.crit > 0 && (
            <div className="flex gap-2 text-[9px] font-bold">
              {checkSummary.ok > 0 && <span className="text-status-ok">✓{checkSummary.ok}</span>}
              {checkSummary.warn > 0 && (
                <span className="text-status-warn">⚠{checkSummary.warn}</span>
              )}
              {checkSummary.crit > 0 && (
                <span className="text-status-crit">✕{checkSummary.crit}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// HUDTooltipCard — picks variant based on style prop
// Used both by HUDTooltip (portal) and by the settings visual picker
// ══════════════════════════════════════════════════════════════════════════════

type CardProps = {
  style: TooltipStyle;
  aura: boolean;
  mousePos?: { x: number; y: number };
} & Omit<HUDTooltipProps, 'mousePos'>

export const HUDTooltipCard = ({ style, aura, ...props }: CardProps) => {
  switch (style) {
    case 'compact':
      return <CompactCard {...props} aura={aura} />;
    case 'glass':
      return <GlassCard {...props} aura={aura} />;
    case 'terminal':
      return <TerminalCard {...props} aura={aura} />;
    case 'split':
      return <SplitCard {...props} aura={aura} />;
    case 'ultracompact':
      return <UltraCompactCard {...props} aura={aura} />;
    case 'tinted':
    default:
      return <TintedCard {...props} aura={aura} />;
  }
};

// ── Width per style ─────────────────────────────────────────────────────────────

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

// ══════════════════════════════════════════════════════════════════════════════
// HUDTooltip — portal wrapper, reads tooltip settings
// ══════════════════════════════════════════════════════════════════════════════

export const HUDTooltip = ({ mousePos, ...props }: HUDTooltipProps) => {
  const { style, aura } = useTooltipSettings();
  const showBelow = mousePos.y < 400;
  const widthClass = STYLE_WIDTH[style];

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: showBelow ? `${mousePos.y + 12}px` : `${mousePos.y - 12}px`,
        left: `${mousePos.x}px`,
        transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        zIndex: 999999,
        pointerEvents: 'none',
      }}
      className={`animate-in fade-in zoom-in-95 ${widthClass} duration-150 ease-out`}
    >
      <HUDTooltipCard style={style} aura={aura} {...props} />
    </div>,
    document.getElementById('tooltip-root')!
  );
};
