/**
 * HUD Tooltip Preview — static variants for design validation.
 * Self-contained: no imports from RackVisualizer, no side effects.
 */
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';
import { Server, Router, Zap, Power, Cpu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────

type Status = 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN';

const STATUS = {
  OK: { hex: '#22c55e', text: 'text-emerald-400', bg: 'bg-emerald-500', glow: 'rgba(34,197,94,' },
  WARN: { hex: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500', glow: 'rgba(245,158,11,' },
  CRIT: { hex: '#ef4444', text: 'text-red-400', bg: 'bg-red-500', glow: 'rgba(239,68,68,' },
  UNKNOWN: { hex: '#6b7280', text: 'text-gray-400', bg: 'bg-gray-500', glow: 'rgba(107,114,128,' },
};

const tempColor = (v: number, w?: number, c?: number) =>
  c && v >= c ? STATUS.CRIT : w && v >= w ? STATUS.WARN : STATUS.OK;

const fmtPower = (w: number) => (w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`);

// ── Arc SVG (pure visual gauge) ────────────────────────────────────────────────

const Arc = ({ value, warn, crit }: { value: number; warn?: number; crit?: number }) => {
  const S = 76,
    cx = S / 2,
    cy = S / 2 + 3,
    R = 28,
    SW = 5;
  const RL = R + SW / 2 + 8,
    START = -135,
    SWEEP = 270;
  const max = crit ? crit * 1.15 : 60;
  const pct = value > 0 ? Math.min(1, value / max) : 0;
  const col = value > 0 ? tempColor(value, warn, crit).hex : '#374151';
  const rad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r = R) => ({
    x: cx + r * Math.cos(rad(deg)),
    y: cy + r * Math.sin(rad(deg)),
  });
  const arc = (f: number, t: number) => {
    const s = pt(f),
      e = pt(t),
      lg = t - f > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };
  const fillEnd = START + SWEEP * pct;
  const wP = warn && crit ? warn / max : null;
  const cP = crit ? crit / max : null;
  return (
    <svg
      width={S}
      height={S}
      viewBox={`0 0 ${S} ${S}`}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <path
        d={arc(START, START + SWEEP)}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={SW}
        strokeLinecap="round"
      />
      {value > 0 && pct > 0.01 && (
        <path
          d={arc(START, fillEnd)}
          fill="none"
          stroke={col}
          strokeWidth={SW}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${col}99)` }}
        />
      )}
      {wP !== null && warn && (
        <>
          <circle
            cx={pt(START + SWEEP * wP).x}
            cy={pt(START + SWEEP * wP).y}
            r={SW / 2 + 1}
            fill="#f59e0b"
            opacity={0.7}
          />
          <text
            x={pt(START + SWEEP * wP, RL).x}
            y={pt(START + SWEEP * wP, RL).y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="6"
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
            r={SW / 2 + 1}
            fill="#ef4444"
            opacity={0.7}
          />
          <text
            x={pt(START + SWEEP * cP, RL).x}
            y={pt(START + SWEEP * cP, RL).y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="6"
            fontWeight="700"
            fontFamily="monospace"
            fill="#dc2626"
            opacity="0.9"
          >
            {crit}°
          </text>
        </>
      )}
    </svg>
  );
};

// ── Power bar ──────────────────────────────────────────────────────────────────

const PBar = ({ w, max }: { w: number; max: number }) => {
  const p = Math.min(100, Math.round((w / max) * 100));
  const c = p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-amber-500' : 'bg-yellow-400/60';
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`absolute inset-y-0 left-0 rounded-full ${c}`} style={{ width: `${p}%` }} />
      </div>
      <span className="shrink-0 font-mono text-[9px] text-gray-500">{p}%</span>
    </div>
  );
};

// ── Tooltip card ───────────────────────────────────────────────────────────────

type Reason = {
  label: string;
  severity?: string;
};
type Checks = {
  ok: number;
  warn: number;
  crit: number;
};
type Icon = LucideIcon;

type CardProps = {
  title: string;
  subtitle?: string;
  status: Status;
  enclosure?: string;
  icon?: Icon;
  checks?: Checks;
  location?: string;
  alerts?: Reason[];
  temp?: number;
  tempWarn?: number;
  tempCrit?: number;
  power?: number;
  powerMax?: number;
  label?: string; // optional badge label for the card
};

const TooltipCard = ({
  title,
  subtitle,
  status,
  enclosure,
  icon: Icon,
  checks,
  location,
  alerts = [],
  temp,
  tempWarn,
  tempCrit,
  power,
  powerMax,
}: CardProps) => {
  const st = STATUS[status];
  const hasAlerts = alerts.length > 0;
  const hasMetrics = temp !== undefined || (power !== undefined && power > 0);
  const hasFooter = location ?? (checks && checks.ok + checks.warn + checks.crit > 0);
  const tColor = temp !== undefined && temp > 0 ? tempColor(temp, tempWarn, tempCrit) : null;
  const tLabel =
    temp !== undefined && temp > 0 && tempWarn !== undefined
      ? temp >= (tempCrit ?? Infinity)
        ? 'CRIT'
        : temp >= tempWarn
          ? 'WARN'
          : 'OK'
      : null;
  const glow =
    status === 'CRIT'
      ? `0 0 0 1px ${st.hex}22, 0 12px 48px ${st.hex}44, 0 4px 16px rgba(0,0,0,0.5)`
      : status === 'WARN'
        ? `0 0 0 1px ${st.hex}18, 0 8px 36px ${st.hex}33, 0 4px 16px rgba(0,0,0,0.5)`
        : '0 8px 40px rgba(0,0,0,0.5)';

  return (
    <div
      className="w-80 overflow-hidden rounded-2xl border border-white/[0.06] bg-gray-950 font-sans"
      style={{ boxShadow: glow }}
    >
      {/* Header — tinted */}
      <div className="px-4 pt-4 pb-3" style={{ background: `${st.hex}0d` }}>
        <div className="flex items-start gap-2.5">
          {Icon && (
            <div className="mt-0.5 shrink-0 rounded-lg bg-white/[0.06] p-1.5">
              <Icon className="h-3.5 w-3.5 text-gray-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold tracking-[0.2em] text-gray-500 uppercase">
              {subtitle ?? 'Node'}
            </div>
            <div className="mt-0.5 text-xl leading-tight font-black tracking-tight text-white uppercase">
              {title}
            </div>
            {enclosure && (
              <div className="mt-0.5 text-[11px] leading-snug text-gray-500">{enclosure}</div>
            )}
          </div>
          <div className={`mt-0.5 flex shrink-0 items-center gap-1.5 ${st.text}`}>
            <div
              className={`h-2 w-2 rounded-full ${st.bg} ${status === 'CRIT' ? 'animate-pulse' : ''}`}
              style={{ boxShadow: `0 0 6px ${st.hex}` }}
            />
            <span className="text-[11px] font-black tracking-wider uppercase">{status}</span>
          </div>
        </div>
      </div>
      {/* Colored separator */}
      <div
        className="h-px"
        style={{ background: `linear-gradient(to right, ${st.hex}50, ${st.hex}18, transparent)` }}
      />

      <div className="space-y-3 px-4 py-3">
        {/* Alerts FIRST */}
        {hasAlerts && (
          <div className="space-y-[3px]">
            {alerts.map((r, i) => (
              <div
                key={i} // eslint-disable-line react/no-array-index-key
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                  r.severity === 'CRIT'
                    ? 'bg-red-500/[0.09]'
                    : r.severity === 'WARN'
                      ? 'bg-amber-500/[0.09]'
                      : 'bg-white/[0.03]'
                }`}
              >
                <div
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    r.severity === 'CRIT'
                      ? 'animate-pulse bg-red-500'
                      : r.severity === 'WARN'
                        ? 'bg-amber-500'
                        : 'bg-gray-600'
                  }`}
                />
                <span className="min-w-0 flex-1 truncate text-[11px] text-gray-200">{r.label}</span>
                {r.severity && (
                  <span
                    className={`shrink-0 text-[9px] font-black tracking-wider uppercase ${
                      r.severity === 'CRIT'
                        ? 'text-red-400'
                        : r.severity === 'WARN'
                          ? 'text-amber-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {r.severity}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Metrics */}
        {hasMetrics && (
          <div
            className={`flex items-start gap-3 ${hasAlerts ? 'border-t border-white/[0.05] pt-3' : ''}`}
          >
            {/* Thermal — arc (pure) + value + label below */}
            {temp !== undefined && (
              <div className="flex shrink-0 flex-col items-center gap-1">
                <Arc value={temp} warn={tempWarn} crit={tempCrit} />
                <div className="text-center">
                  <span
                    className={`font-mono text-[15px] leading-none font-black ${tColor?.text ?? 'text-gray-300'}`}
                  >
                    {temp > 0 ? temp.toFixed(1) : '--'}
                    <span className="ml-0.5 text-[9px] font-normal text-gray-500">°C</span>
                  </span>
                  {tLabel && tLabel !== 'OK' && (
                    <div
                      className={`mt-0.5 text-[8px] font-black tracking-widest uppercase ${tColor?.text}`}
                    >
                      {tLabel}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Power */}
            {power !== undefined && power > 0 && (
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pt-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-400/80" />
                  <span className="font-mono text-[17px] leading-none font-black text-gray-100">
                    {fmtPower(power)}
                  </span>
                </div>
                {powerMax && powerMax > 0 && <PBar w={power} max={powerMax} />}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {hasFooter && (
          <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5">
            {location && <span className="font-mono text-[11px] text-gray-500">{location}</span>}
            {checks && checks.ok + checks.warn + checks.crit > 0 && (
              <div className="flex shrink-0 items-center gap-2.5 text-[11px] font-bold">
                {checks.ok > 0 && (
                  <span className="flex items-center gap-0.5 text-emerald-400">✓{checks.ok}</span>
                )}
                {checks.warn > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-400">⚠{checks.warn}</span>
                )}
                {checks.crit > 0 && (
                  <span className="flex items-center gap-0.5 text-red-400">✕{checks.crit}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Variants data ──────────────────────────────────────────────────────────────

const VARIANTS: (CardProps & { label: string; desc: string })[] = [
  {
    label: 'Compute — OK',
    desc: 'Healthy compute node. Metrics available, no alerts.',
    title: 'COMPUTE042',
    subtitle: 'Node',
    status: 'OK',
    enclosure: 'BullSequana X410 (1U Twin CPU)',
    icon: Server,
    temp: 27.4,
    tempWarn: 38,
    tempCrit: 45,
    power: 167,
    powerMax: 350,
    location: 'RACK U12 · S1',
    checks: { ok: 5, warn: 0, crit: 0 },
  },
  {
    label: 'Compute — WARN',
    desc: 'Temperature above WARN threshold. Alert visible before metrics.',
    title: 'COMPUTE125',
    subtitle: 'Node',
    status: 'WARN',
    enclosure: 'BullSequana X410 (1U Twin CPU)',
    icon: Server,
    temp: 39.8,
    tempWarn: 38,
    tempCrit: 45,
    power: 285,
    powerMax: 350,
    location: 'RACK U14 · S2',
    checks: { ok: 4, warn: 1, crit: 0 },
    alerts: [{ label: 'IPMI temperature high', severity: 'WARN' }],
  },
  {
    label: 'Compute — CRIT',
    desc: 'Critical node. Multiple checks failing. Alerts in foreground.',
    title: 'COMPUTE031',
    subtitle: 'Node',
    status: 'CRIT',
    enclosure: 'BullSequana X410 (1U Twin CPU)',
    icon: Server,
    temp: 47.2,
    tempWarn: 38,
    tempCrit: 45,
    power: 312,
    powerMax: 350,
    location: 'RACK U08 · S1',
    checks: { ok: 3, warn: 0, crit: 2 },
    alerts: [
      { label: 'IPMI temperature high', severity: 'CRIT' },
      { label: 'IPMI fan speed state', severity: 'WARN' },
    ],
  },
  {
    label: 'GPU Node — WARN',
    desc: 'GPU with high thresholds (warn=52°C). Power bar at 87%.',
    title: 'VISU003',
    subtitle: 'Node',
    status: 'WARN',
    enclosure: 'BullSequana X2415 (4U Quad GPU)',
    icon: Cpu,
    temp: 53.1,
    tempWarn: 52,
    tempCrit: 65,
    power: 520,
    powerMax: 600,
    location: 'RACK U03 · S2',
    checks: { ok: 3, warn: 1, crit: 0 },
    alerts: [{ label: 'IPMI temperature high', severity: 'WARN' }],
  },
  {
    label: 'Node down — CRIT',
    desc: 'Unreachable node. No metrics, alerts only.',
    title: 'COMPUTE007',
    subtitle: 'Node',
    status: 'CRIT',
    enclosure: 'BullSequana X440 (2U 4-node)',
    icon: Server,
    location: 'RACK U22 · S3',
    checks: { ok: 0, warn: 0, crit: 3 },
    alerts: [
      { label: 'Node up', severity: 'CRIT' },
      { label: 'IPMI exporter up', severity: 'CRIT' },
      { label: 'Node recent reboot', severity: 'WARN' },
    ],
  },
  {
    label: 'Network switch — OK',
    desc: 'Switch with lower thresholds (warn=40°C). No max power defined.',
    title: 'SW-IB-R02-01',
    subtitle: 'Network',
    status: 'OK',
    enclosure: 'BullSequana IB Switch (1U)',
    icon: Router,
    temp: 34.2,
    tempWarn: 40,
    tempCrit: 50,
    power: 175,
    location: 'RACK U42',
    checks: { ok: 3, warn: 0, crit: 0 },
  },
  {
    label: 'Network switch — WARN',
    desc: 'Switch near thermal threshold. Check alert triggered.',
    title: 'SW-ETH-R01-03',
    subtitle: 'Network',
    status: 'WARN',
    enclosure: 'Ethernet ToR Switch (1U)',
    icon: Router,
    temp: 41.5,
    tempWarn: 40,
    tempCrit: 50,
    power: 142,
    location: 'RACK U44',
    checks: { ok: 2, warn: 1, crit: 0 },
    alerts: [{ label: 'IPMI temperature high', severity: 'WARN' }],
  },
  {
    label: 'Storage — CRIT',
    desc: 'E-Series storage array. Server icon (no HardDrive import here). Storage metrics.',
    title: 'STORAGE001',
    subtitle: 'Storage',
    status: 'CRIT',
    enclosure: 'NetApp E-Series (4U)',
    icon: Server,
    temp: 32.1,
    tempWarn: 35,
    tempCrit: 42,
    power: 890,
    powerMax: 1200,
    location: 'RACK U01',
    checks: { ok: 2, warn: 0, crit: 1 },
    alerts: [{ label: 'E-Series storage system status', severity: 'CRIT' }],
  },
  {
    label: 'PDU Raritan — WARN',
    desc: 'PDU component. Power icon. No temperature, power only.',
    title: 'PDU-R02-01',
    subtitle: 'PDU',
    status: 'WARN',
    icon: Power,
    power: 3800,
    powerMax: 4600,
    location: 'RACK R02-01',
    checks: { ok: 1, warn: 1, crit: 0 },
    alerts: [{ label: 'PDU current high (warn)', severity: 'WARN' }],
  },
  {
    label: 'Multi-node chassis — WARN',
    desc: '4-node chassis. Aggregated alerts from all nodes.',
    title: 'R02-01-DA03',
    subtitle: 'Device',
    status: 'WARN',
    enclosure: 'BullSequana XH3515 NEBA (1U, 2-node)',
    icon: Server,
    location: 'RACK U18',
    checks: { ok: 6, warn: 2, crit: 0 },
    alerts: [
      { label: 'IPMI fan speed state', severity: 'WARN' },
      { label: 'IPMI temperature high', severity: 'WARN' },
    ],
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export const HUDTooltipPage = () => {
  usePageTitle('HUD Tooltip');

  return (
    <div className="space-y-8">
      <PageHeader
        title="HUD Tooltip"
        description="Preview of all tooltip variants — node states, device types, alert combinations. Dark background required."
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'HUD Tooltip' },
            ]}
          />
        }
      />

      <div className="rounded-xl bg-gray-950 p-8">
        <div className="flex flex-wrap gap-6">
          {VARIANTS.map((v) => (
            <div key={v.label} className="flex flex-col gap-2">
              {/* Card */}
              <TooltipCard {...v} />
              {/* Label below */}
              <div className="mt-1">
                <div className="text-[11px] font-semibold text-gray-300">{v.label}</div>
                <div className="text-[10px] text-gray-500">{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
