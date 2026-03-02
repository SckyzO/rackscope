/**
 * useTooltipSettings — manages HUD tooltip style + aura in localStorage.
 *
 * Preferences are UI-only and NOT saved to app.yaml.
 * Changes broadcast via 'rackscope-tooltip-settings' event so all
 * mounted HUDTooltip instances react immediately.
 */

import { useState, useEffect } from 'react';

export type TooltipStyle =
  | 'compact' // Style 1 — compact strip, split temp/power
  | 'border' // Style 4 — top+left colored border
  | 'terminal' // Style 6 — monospace HPC style
  | 'notification' // Style 8 — notification card
  | 'tinted' // Style 9 — tinted header sections (default)
  | 'ultracompact'; // Style 10 — 220px cluster view

export interface TooltipStyleMeta {
  id: TooltipStyle;
  label: string;
  desc: string;
  width: string; // Tailwind width class
}

export const TOOLTIP_STYLES: TooltipStyleMeta[] = [
  { id: 'tinted', label: 'Tinted', desc: 'Sections colorées — défaut', width: 'w-80' },
  { id: 'compact', label: 'Compact', desc: 'Barre top + split temp/power', width: 'w-80' },
  { id: 'glass', label: 'Glass cards', desc: 'Glassmorphism + 2 metric cards', width: 'w-80' },
  { id: 'split', label: 'Split layout', desc: 'Infos gauche, arc droite', width: 'w-80' },
  { id: 'terminal', label: 'Terminal', desc: 'Style monospace HPC', width: 'w-72' },
  { id: 'ultracompact', label: 'Ultra-compact', desc: 'Vue cluster, 220px', width: 'w-56' },
];

const LS_STYLE = 'rackscope.tooltip.style';
const LS_AURA = 'rackscope.tooltip.aura';
const DEFAULT_STYLE: TooltipStyle = 'tinted';
const EV = 'rackscope-tooltip-settings';

function readStyle(): TooltipStyle {
  const v = localStorage.getItem(LS_STYLE);
  return TOOLTIP_STYLES.some((s) => s.id === v) ? (v as TooltipStyle) : DEFAULT_STYLE;
}

function readAura(): boolean {
  return localStorage.getItem(LS_AURA) !== 'false';
}

export function useTooltipSettings() {
  const [style, _setStyle] = useState<TooltipStyle>(readStyle);
  const [aura, _setAura] = useState<boolean>(readAura);

  // React to changes dispatched by other mounted instances (e.g. settings page)
  useEffect(() => {
    const handler = () => {
      _setStyle(readStyle());
      _setAura(readAura());
    };
    window.addEventListener(EV, handler);
    return () => window.removeEventListener(EV, handler);
  }, []);

  const setStyle = (s: TooltipStyle) => {
    localStorage.setItem(LS_STYLE, s);
    _setStyle(s);
    window.dispatchEvent(new Event(EV));
  };

  const setAura = (v: boolean) => {
    localStorage.setItem(LS_AURA, String(v));
    _setAura(v);
    window.dispatchEvent(new Event(EV));
  };

  return { style, aura, setStyle, setAura };
}
