// Shared primitive components used by multiple widgets.
// These are NOT registered — they are internal building blocks.

import { ChevronRight } from 'lucide-react';
import { getSeverityLabel } from '../lib/severityLabels';
import type { ActiveAlert } from '../../types';

// ── StatCard ──────────────────────────────────────────────────────────────────

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
};

export const StatCard = ({ icon: Icon, label, value, color, sub }: StatCardProps) => (
  <div className="flex h-full items-center gap-4 p-4">
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${color}18` }}
    >
      <Icon className="h-5 w-5" style={{ color }} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-600">{sub}</p>}
    </div>
  </div>
);

// ── AlertSevBadge ─────────────────────────────────────────────────────────────

export const AlertSevBadge = ({ state }: { state: string }) => {
  if (state === 'CRIT')
    return (
      <span className="bg-error-50 text-error-500 dark:bg-error-500/15 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
        {getSeverityLabel('CRIT')}
      </span>
    );
  return (
    <span className="bg-warning-50 text-warning-500 dark:bg-warning-500/15 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
      <span className="bg-warning-500 h-1.5 w-1.5 rounded-full" />
      {getSeverityLabel('WARN')}
    </span>
  );
};

// ── AlertRow ──────────────────────────────────────────────────────────────────

type AlertRowProps = { alert: ActiveAlert; onClick: () => void };

export const AlertRow = ({ alert, onClick }: AlertRowProps) => (
  <button
    onClick={onClick}
    className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
  >
    <AlertSevBadge state={alert.state} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{alert.node_id}</p>
      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
        {[alert.device_name, alert.rack_name, alert.room_name].filter(Boolean).join(' · ')}
      </p>
    </div>
    {alert.checks.length > 0 && (
      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {alert.checks[0].id}
        {alert.checks.length > 1 ? ` +${alert.checks.length - 1}` : ''}
      </span>
    )}
    <ChevronRight className="group-hover:text-brand-500 h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors dark:text-gray-700" />
  </button>
);

// ── HealthGauge SVG ───────────────────────────────────────────────────────────

type GaugeProps = { score: number; size?: number };

export const HealthGauge = ({ score, size = 140 }: GaugeProps) => {
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength - (Math.min(100, Math.max(0, score)) / 100) * arcLength;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="text-gray-900 dark:text-white"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        className="stroke-gray-100 dark:stroke-gray-800"
        strokeWidth={10}
        strokeDasharray={`${arcLength} ${circumference - arcLength}`}
        strokeDashoffset={circumference * 0.125}
        strokeLinecap="round"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={`${arcLength - dashOffset} ${circumference - (arcLength - dashOffset)}`}
        strokeDashoffset={circumference * 0.125}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="700"
        fill="currentColor"
      >
        {Math.round(score)}%
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="9"
        fill="#9ca3af"
        letterSpacing="1"
      >
        HEALTH
      </text>
    </svg>
  );
};

// ── SeverityDonut SVG ─────────────────────────────────────────────────────────

const polarToXY = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

export const SeverityDonut = ({ slices }: { slices: { label: string; count: number; color: string }[] }) => {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 54;
  const innerR = 36;
  const total = slices.reduce((s, d) => s + d.count, 0);
  if (total === 0)
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-xs text-gray-400"
      >
        No data
      </div>
    );

  const paths = slices
    .filter((s) => s.count > 0)
    .reduce<{ items: { d: string; color: string; label: string; count: number }[]; angle: number }>(
      (acc, s) => {
        const fraction = s.count / total;
        const sweepAngle = fraction * 360;
        const endAngle = acc.angle + sweepAngle;
        const largeArc = sweepAngle > 180 ? 1 : 0;
        const p1 = polarToXY(cx, cy, outerR, acc.angle);
        const p2 = polarToXY(cx, cy, outerR, endAngle);
        const p3 = polarToXY(cx, cy, innerR, endAngle);
        const p4 = polarToXY(cx, cy, innerR, acc.angle);
        const d = `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
        return {
          items: [...acc.items, { d, color: s.color, label: s.label, count: s.count }],
          angle: endAngle,
        };
      },
      { items: [], angle: 0 }
    ).items;

  const dominant = slices
    .filter((s) => s.count > 0)
    .sort((a, b) => {
      const order = ['CRIT', 'WARN', 'UNKNOWN', 'OK'];
      return order.indexOf(a.label) - order.indexOf(b.label);
    })[0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="700"
        fill={dominant?.color ?? '#9ca3af'}
      >
        {dominant ? getSeverityLabel(dominant.label) : ''}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fill="#9ca3af"
      >
        {total} nodes
      </text>
    </svg>
  );
};

// ── WidgetPlaceholder ─────────────────────────────────────────────────────────

export const WidgetPlaceholder = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ElementType;
}) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
    <Icon className="h-8 w-8 text-gray-300 dark:text-gray-700" />
    <p className="text-xs text-gray-400">{title}</p>
  </div>
);
