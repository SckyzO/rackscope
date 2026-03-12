/* eslint-disable react-refresh/only-export-components */
/**
 * AppIcon — renders the user-selected app icon using currentColor.
 * Icons are 20×20 viewBox and use currentColor + opacity for shading.
 * Export getIconSvgString() for favicon generation (used by ThemeContext).
 */
import type { IconId, IconBg } from '@src/context/ThemeContext';

interface AppIconProps {
  id: IconId;
  className?: string;
}

// ── SVG path data per icon (viewBox 0 0 20 20, currentColor) ─────────────────

const ICON_PATHS: Record<IconId, string> = {
  'server-stack': `
    <rect x="2" y="3" width="16" height="3" rx=".75" fill="currentColor"/>
    <rect x="2" y="7.5" width="16" height="3" rx=".75" fill="currentColor" opacity=".7"/>
    <rect x="2" y="12" width="16" height="3" rx=".75" fill="currentColor" opacity=".5"/>
    <rect x="2" y="16.5" width="16" height="3" rx=".75" fill="currentColor" opacity=".3"/>
    <circle cx="17" cy="4.5" r="1" fill="currentColor"/>
  `,
  'minimal-rack': `
    <rect x="2" y="2" width="16" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <rect x="4" y="5.5" width="10" height="2" rx=".5" fill="currentColor" opacity=".5"/>
    <rect x="4" y="9" width="10" height="2" rx=".5" fill="currentColor" opacity=".5"/>
    <rect x="4" y="12.5" width="10" height="2" rx=".5" fill="currentColor" opacity=".5"/>
    <circle cx="16" cy="6.5" r="1" fill="currentColor"/>
  `,
  'rack-pulse': `
    <rect x="2" y="3" width="9" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".1"/>
    <line x1="4" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1" opacity=".6"/>
    <line x1="4" y1="10" x2="9" y2="10" stroke="currentColor" stroke-width="1" opacity=".6"/>
    <line x1="4" y1="13" x2="9" y2="13" stroke="currentColor" stroke-width="1" opacity=".6"/>
    <circle cx="14" cy="10" r="1" fill="currentColor"/>
    <circle cx="14" cy="10" r="3" stroke="currentColor" stroke-width="1" fill="none" opacity=".5"/>
    <circle cx="14" cy="10" r="5" stroke="currentColor" stroke-width=".75" fill="none" opacity=".25"/>
  `,
  'status-matrix': `
    <circle cx="5" cy="5" r="2" fill="currentColor"/>
    <circle cx="10" cy="5" r="2" fill="currentColor" opacity=".7"/>
    <circle cx="15" cy="5" r="2" fill="currentColor" opacity=".9"/>
    <circle cx="5" cy="10" r="2" fill="currentColor" opacity=".5"/>
    <circle cx="10" cy="10" r="2" fill="currentColor"/>
    <circle cx="15" cy="10" r="2" fill="currentColor" opacity=".3"/>
    <circle cx="5" cy="15" r="2" fill="currentColor" opacity=".6"/>
    <circle cx="10" cy="15" r="2" fill="currentColor" opacity=".3"/>
    <circle cx="15" cy="15" r="2" fill="currentColor" opacity=".8"/>
  `,
  'grid-floor': `
    <rect x="1" y="1" width="18" height="18" rx="1" stroke="currentColor" stroke-width=".75" fill="none" opacity=".3"/>
    <line x1="1" y1="7" x2="19" y2="7" stroke="currentColor" stroke-width=".5" opacity=".3"/>
    <line x1="1" y1="13" x2="19" y2="13" stroke="currentColor" stroke-width=".5" opacity=".3"/>
    <line x1="7" y1="1" x2="7" y2="19" stroke="currentColor" stroke-width=".5" opacity=".3"/>
    <line x1="13" y1="1" x2="13" y2="19" stroke="currentColor" stroke-width=".5" opacity=".3"/>
    <rect x="2" y="2" width="4" height="4" rx=".5" fill="currentColor" opacity=".8"/>
    <rect x="8" y="2" width="4" height="4" rx=".5" fill="currentColor" opacity=".4"/>
    <rect x="14" y="2" width="4" height="4" rx=".5" fill="currentColor" opacity=".8"/>
    <rect x="2" y="8" width="4" height="4" rx=".5" fill="currentColor" opacity=".4"/>
    <rect x="8" y="8" width="4" height="4" rx=".5" fill="currentColor"/>
    <rect x="14" y="8" width="4" height="4" rx=".5" fill="currentColor" opacity=".6"/>
    <rect x="2" y="14" width="4" height="4" rx=".5" fill="currentColor" opacity=".6"/>
    <rect x="8" y="14" width="4" height="4" rx=".5" fill="currentColor" opacity=".8"/>
    <rect x="14" y="14" width="4" height="4" rx=".5" fill="currentColor" opacity=".3"/>
  `,
  'binary-rack': `
    <rect x="1.5" y="1.5" width="17" height="17" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".04"/>
    <rect x="3" y="3.5" width="2.5" height="2.5" rx=".4" fill="currentColor"/>
    <rect x="6.5" y="3.5" width="2.5" height="2.5" rx=".4" fill="currentColor" opacity=".25"/>
    <rect x="10" y="3.5" width="2.5" height="2.5" rx=".4" fill="currentColor"/>
    <rect x="13.5" y="3.5" width="2.5" height="2.5" rx=".4" fill="currentColor" opacity=".25"/>
    <rect x="3" y="7.5" width="2.5" height="2.5" rx=".4" fill="currentColor" opacity=".25"/>
    <rect x="6.5" y="7.5" width="2.5" height="2.5" rx=".4" fill="currentColor"/>
    <rect x="10" y="7.5" width="2.5" height="2.5" rx=".4" fill="currentColor" opacity=".25"/>
    <rect x="13.5" y="7.5" width="2.5" height="2.5" rx=".4" fill="currentColor"/>
    <rect x="3" y="11.5" width="2.5" height="2.5" rx=".4" fill="currentColor"/>
    <rect x="6.5" y="11.5" width="2.5" height="2.5" rx=".4" fill="currentColor"/>
    <rect x="10" y="11.5" width="2.5" height="2.5" rx=".4" fill="currentColor" opacity=".25"/>
    <rect x="13.5" y="11.5" width="2.5" height="2.5" rx=".4" fill="currentColor" opacity=".25"/>
    <rect x="3" y="15" width="2.5" height="2.5" rx=".4" fill="currentColor" opacity=".25"/>
    <rect x="6.5" y="15" width="2.5" height="2.5" rx=".4" fill="currentColor"/>
    <rect x="10" y="15" width="2.5" height="2.5" rx=".4" fill="currentColor"/>
    <rect x="13.5" y="15" width="2.5" height="2.5" rx=".4" fill="currentColor" opacity=".25"/>
  `,
  'alert-panel': `
    <rect x="2" y="2" width="16" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".06"/>
    <rect x="4" y="5" width="10" height="2" rx=".5" fill="currentColor" opacity=".7"/>
    <rect x="4" y="9" width="10" height="2" rx=".5" fill="currentColor" opacity=".5"/>
    <rect x="4" y="13" width="6" height="2" rx=".5" fill="currentColor" opacity=".35"/>
    <rect x="12" y="12.5" width="4" height="4" rx=".75" fill="currentColor" opacity=".8"/>
  `,
  'disk-array': `
    <rect x="2" y="3" width="16" height="4" rx="1" fill="currentColor" opacity=".8"/>
    <rect x="2" y="8.5" width="16" height="4" rx="1" fill="currentColor" opacity=".6"/>
    <rect x="2" y="14" width="16" height="4" rx="1" fill="currentColor" opacity=".35"/>
    <circle cx="16.5" cy="5" r="1" fill="currentColor" opacity=".4"/>
    <circle cx="16.5" cy="10.5" r="1" fill="currentColor" opacity=".4"/>
    <circle cx="16.5" cy="16" r="1" fill="currentColor" opacity=".4"/>
    <rect x="4" y="4" width="6" height="1.5" rx=".4" fill="currentColor" opacity=".2"/>
    <rect x="4" y="9.5" width="6" height="1.5" rx=".4" fill="currentColor" opacity=".2"/>
  `,
  'heatmap': `
    <rect x="2" y="2" width="4" height="4" rx=".5" fill="currentColor"/>
    <rect x="7" y="2" width="4" height="4" rx=".5" fill="currentColor" opacity=".7"/>
    <rect x="12" y="2" width="4" height="4" rx=".5" fill="currentColor" opacity=".4"/>
    <rect x="2" y="7" width="4" height="4" rx=".5" fill="currentColor" opacity=".6"/>
    <rect x="7" y="7" width="4" height="4" rx=".5" fill="currentColor" opacity=".9"/>
    <rect x="12" y="7" width="4" height="4" rx=".5" fill="currentColor" opacity=".7"/>
    <rect x="2" y="12" width="4" height="4" rx=".5" fill="currentColor" opacity=".3"/>
    <rect x="7" y="12" width="4" height="4" rx=".5" fill="currentColor" opacity=".5"/>
    <rect x="12" y="12" width="4" height="4" rx=".5" fill="currentColor" opacity=".85"/>
    <rect x="1" y="17.5" width="18" height="1" rx=".5" fill="currentColor" opacity=".15"/>
  `,
  'node-health': `
    <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" opacity=".8"/>
    <rect x="8" y="2" width="5" height="5" rx="1" fill="currentColor" opacity=".9"/>
    <rect x="14" y="2" width="5" height="5" rx="1" fill="currentColor" opacity=".4"/>
    <rect x="2" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".5"/>
    <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor"/>
    <rect x="14" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/>
    <rect x="2" y="14" width="5" height="5" rx="1" fill="currentColor" opacity=".7"/>
    <rect x="8" y="14" width="5" height="5" rx="1" fill="currentColor" opacity=".3"/>
    <rect x="14" y="14" width="5" height="5" rx="1" fill="currentColor" opacity=".6"/>
  `,
  'incident-flag': `
    <rect x="2" y="2" width="16" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".06"/>
    <rect x="4" y="5.5" width="8" height="2" rx=".5" fill="currentColor" opacity=".6"/>
    <rect x="4" y="9.5" width="8" height="2" rx=".5" fill="currentColor" opacity=".4"/>
    <rect x="4" y="13.5" width="5" height="2" rx=".5" fill="currentColor" opacity=".25"/>
    <rect x="14" y="4.5" width="3" height="7" rx=".75" fill="currentColor" opacity=".9"/>
    <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" opacity=".9"/>
  `,
  'health-score': `
    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".06"/>
    <circle cx="10" cy="10" r="5" stroke="currentColor" stroke-width="1" fill="none" opacity=".35" stroke-dasharray="3 2"/>
    <rect x="6" y="8" width="8" height="1.5" rx=".4" fill="currentColor" opacity=".6"/>
    <rect x="6" y="10.5" width="8" height="1.5" rx=".4" fill="currentColor" opacity=".4"/>
    <circle cx="16" cy="4" r="2" fill="currentColor" opacity=".7"/>
  `,
  'rack-blueprint': `
    <line x1="1" y1="5" x2="19" y2="5" stroke="currentColor" stroke-width=".5" opacity=".2"/>
    <line x1="1" y1="9" x2="19" y2="9" stroke="currentColor" stroke-width=".5" opacity=".2"/>
    <line x1="1" y1="13" x2="19" y2="13" stroke="currentColor" stroke-width=".5" opacity=".2"/>
    <line x1="1" y1="17" x2="19" y2="17" stroke="currentColor" stroke-width=".5" opacity=".2"/>
    <rect x="4" y="2" width="12" height="16" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <rect x="6" y="4.5" width="8" height="2" rx=".4" fill="currentColor" opacity=".7"/>
    <rect x="6" y="8.5" width="8" height="2" rx=".4" fill="currentColor" opacity=".5"/>
    <rect x="6" y="12.5" width="8" height="2" rx=".4" fill="currentColor" opacity=".35"/>
    <circle cx="14" cy="5.5" r=".75" fill="currentColor"/>
  `,
  'rack-spotlight': `
    <path d="M1 4 L5 6 L5 15 L1 17 Z" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width=".75"/>
    <path d="M19 4 L15 6 L15 15 L19 17 Z" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width=".75"/>
    <rect x="5" y="3" width="10" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".08"/>
    <rect x="7" y="5.5" width="6" height="1.5" rx=".4" fill="currentColor" opacity=".7"/>
    <rect x="7" y="8.5" width="6" height="1.5" rx=".4" fill="currentColor" opacity=".5"/>
    <rect x="7" y="11.5" width="6" height="1.5" rx=".4" fill="currentColor" opacity=".7"/>
    <rect x="7" y="14.5" width="6" height="1.5" rx=".4" fill="currentColor" opacity=".35"/>
    <circle cx="12" cy="6.25" r=".75" fill="currentColor"/>
  `,
};

// ── Icon label map ─────────────────────────────────────────────────────────────

export const ICON_LABELS: Record<IconId, string> = {
  'server-stack': 'Server Stack',
  'minimal-rack': 'Minimal Rack',
  'rack-pulse': 'Rack Pulse',
  'status-matrix': 'Status Matrix',
  'grid-floor': 'Grid Floor Plan',
  'binary-rack': 'Binary Rack',
  'alert-panel': 'Alert Panel',
  'disk-array': 'Disk Array',
  'heatmap': 'Heatmap',
  'node-health': 'Node Health',
  'incident-flag': 'Incident Flag',
  'health-score': 'Health Score',
  'rack-blueprint': 'Rack Blueprint',
  'rack-spotlight': 'Rack Spotlight',
};

// ── Icon background container classes ─────────────────────────────────────────

export const getIconContainerClass = (bg: IconBg): string => {
  const base = 'h-9 w-9 flex items-center justify-center shrink-0 transition-transform select-none active:scale-90';
  switch (bg) {
    case 'badge':  return `${base} bg-brand-500 text-white rounded-lg`;
    case 'soft':   return `${base} bg-brand-50 dark:bg-brand-500/10 text-brand-500 rounded-lg`;
    case 'circle': return `${base} bg-brand-500 text-white rounded-full`;
    case 'ghost':  return `${base} border border-brand-500 text-brand-500 rounded-lg`;
    case 'solo':   return `${base} text-brand-500`;
  }
};

// ── Icon size — solo uses full container size, others use smaller icon-within-container
export const getIconSize = (bg: IconBg): string =>
  bg === 'solo' ? 'h-9 w-9' : 'h-5 w-5';

// ── SVG string for favicon (fills with a concrete color) ──────────────────────

export const getIconSvgString = (id: IconId, color: string): string => {
  const paths = (ICON_PATHS[id] ?? ICON_PATHS['server-stack'])
    .replace(/fill="currentColor"/g, `fill="${color}"`)
    .replace(/stroke="currentColor"/g, `stroke="${color}"`)
    .replace(/fill-opacity="([^"]+)"/g, (_, op) => `fill-opacity="${op}"`)
    .replace(/opacity="([^"]+)"/g, (_, op) => `opacity="${op}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" width="32" height="32">${paths}</svg>`;
};

// ── React component ───────────────────────────────────────────────────────────

export const AppIcon = ({ id, className = 'h-5 w-5' }: AppIconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: ICON_PATHS[id] ?? ICON_PATHS['server-stack'] }}
  />
);
