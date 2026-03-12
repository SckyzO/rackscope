/**
 * ArchDiagram — Rackscope architecture overview
 *
 * Pure inline SVG, zero runtime dependencies.
 * Void dark palette · Outfit typography · brand indigo accents.
 * Import directly in any MDX file:
 *   import ArchDiagram from '@site/src/components/ArchDiagram';
 *   <ArchDiagram />
 */

export default function ArchDiagram() {
  return (
    <svg
      viewBox="0 0 860 380"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Rackscope architecture diagram"
      style={{ width: '100%', maxWidth: 860, height: 'auto', display: 'block', margin: '1.5rem auto' }}
    >
      <defs>
        {/* ── Backgrounds ──────────────────────────────────────── */}
        <radialGradient id="bg-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#0c1628" />
          <stop offset="100%" stopColor="#030712" />
        </radialGradient>

        <pattern id="grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="0.8" cy="0.8" r="0.8" fill="#1f2937" opacity="0.7" />
        </pattern>

        {/* ── Node fills ───────────────────────────────────────── */}
        <linearGradient id="fill-default" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="100%" stopColor="#161f2e" />
        </linearGradient>

        <linearGradient id="fill-hub" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a2642" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>

        {/* ── Glows ────────────────────────────────────────────── */}
        <filter id="glow-brand" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ── Arrows ───────────────────────────────────────────── */}
        <linearGradient id="arrow-h" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#465fff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#465fff" />
          <stop offset="100%" stopColor="#465fff" stopOpacity="0.3" />
        </linearGradient>

        <linearGradient id="arrow-v" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#465fff" />
          <stop offset="100%" stopColor="#465fff" stopOpacity="0.3" />
        </linearGradient>

        <marker id="tip" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0.5 L6,3.5 L0,6.5" fill="none" stroke="#465fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="tip-back" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
          <path d="M6,0.5 L0,3.5 L6,6.5" fill="none" stroke="#465fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {/* ── Background ───────────────────────────────────────────── */}
      <rect width="860" height="380" rx="16" fill="url(#bg-glow)" />
      <rect width="860" height="380" rx="16" fill="url(#grid)" />
      <rect width="860" height="380" rx="16" fill="none" stroke="#1f2937" strokeWidth="1" />

      {/* ── Hub accent ring (Backend glow) ───────────────────────── */}
      <ellipse cx="430" cy="162" rx="130" ry="90" fill="none" stroke="#465fff" strokeWidth="0.5" opacity="0.12" />
      <ellipse cx="430" cy="162" rx="155" ry="110" fill="none" stroke="#465fff" strokeWidth="0.3" opacity="0.07" />

      {/* ═══════════════════════════════════════════════════════════
          ARROWS
          ═══════════════════════════════════════════════════════════ */}

      {/* Config ──► Backend */}
      <line x1="204" y1="162" x2="298" y2="162"
        stroke="url(#arrow-h)" strokeWidth="1.5" markerEnd="url(#tip)" />
      <rect x="213" y="150" width="72" height="18" rx="4" fill="#030712" opacity="0.9" />
      <text x="249" y="163" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" textAnchor="middle" letterSpacing="0.04em">startup</text>

      {/* Backend ◄──► Prometheus */}
      <line x1="566" y1="152" x2="654" y2="152"
        stroke="url(#arrow-h)" strokeWidth="1.5"
        markerStart="url(#tip-back)" markerEnd="url(#tip)" />
      <rect x="574" y="140" width="72" height="18" rx="4" fill="#030712" opacity="0.9" />
      <text x="610" y="153" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" textAnchor="middle" letterSpacing="0.04em">PromQL</text>

      {/* Backend ◄──► Frontend */}
      <line x1="430" y1="226" x2="430" y2="290"
        stroke="url(#arrow-v)" strokeWidth="1.5"
        markerStart="url(#tip-back)" markerEnd="url(#tip)" />
      <rect x="438" y="250" width="70" height="18" rx="4" fill="#030712" opacity="0.9" />
      <text x="473" y="263" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" textAnchor="middle" letterSpacing="0.04em">REST API</text>

      {/* ═══════════════════════════════════════════════════════════
          NODE — YAML CONFIG
          ═══════════════════════════════════════════════════════════ */}
      {/* Shadow */}
      <rect x="24" y="118" width="180" height="88" rx="12" fill="#465fff" opacity="0.04" />
      {/* Card */}
      <rect x="22" y="116" width="180" height="88" rx="12" fill="url(#fill-default)" />
      <rect x="22" y="116" width="180" height="88" rx="12" fill="none" stroke="#1f2937" strokeWidth="1" />
      <rect x="22" y="116" width="180" height="88" rx="12" fill="none" stroke="#465fff" strokeWidth="0.8" opacity="0.25" />
      {/* Top accent line */}
      <rect x="34" y="117" width="60" height="2" rx="1" fill="#465fff" opacity="0.5" />
      {/* Icon: stacked lines (YAML/file) */}
      <rect x="42" y="138" width="18" height="2.5" rx="1.25" fill="#465fff" opacity="0.9" />
      <rect x="42" y="144" width="14" height="2.5" rx="1.25" fill="#465fff" opacity="0.6" />
      <rect x="42" y="150" width="16" height="2.5" rx="1.25" fill="#465fff" opacity="0.4" />
      {/* Labels */}
      <text x="68" y="144" fill="#e5e5e5" fontSize="13" fontFamily="Outfit, system-ui"
        fontWeight="600" letterSpacing="0.01em">YAML Config</text>
      <text x="42" y="172" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">topology · templates</text>
      <text x="42" y="185" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">checks · metrics</text>
      <text x="42" y="198" fill="#374151" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">loaded at startup</text>

      {/* ═══════════════════════════════════════════════════════════
          NODE — BACKEND (hub, prominent)
          ═══════════════════════════════════════════════════════════ */}
      {/* Outer glow */}
      <rect x="296" y="104" width="270" height="124" rx="14"
        fill="#465fff" opacity="0.04" filter="url(#glow-brand)" />
      {/* Card */}
      <rect x="298" y="106" width="266" height="120" rx="13" fill="url(#fill-hub)" />
      <rect x="298" y="106" width="266" height="120" rx="13" fill="none" stroke="#465fff" strokeWidth="1.2" opacity="0.6" />
      {/* Top accent bar — full width */}
      <rect x="298" y="106" width="266" height="3" rx="1.5" fill="#465fff" opacity="0.7" />
      {/* Icon: hexagon (api/service) */}
      <polygon points="324,133 330,129 336,133 336,141 330,145 324,141"
        fill="none" stroke="#465fff" strokeWidth="1.5" opacity="0.8" />
      <circle cx="330" cy="137" r="3" fill="#465fff" opacity="0.6" />
      {/* Labels */}
      <text x="350" y="136" fill="#e5e5e5" fontSize="15" fontFamily="Outfit, system-ui"
        fontWeight="700" letterSpacing="0.01em">Backend</text>
      <text x="350" y="152" fill="#7592ff" fontSize="11"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">FastAPI · :8000</text>
      {/* Divider */}
      <line x1="314" y1="162" x2="548" y2="162" stroke="#1f2937" strokeWidth="1" />
      {/* Feature list */}
      <text x="314" y="178" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">Health Engine  ·  Telemetry Planner</text>
      <text x="314" y="192" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">Plugin Registry  ·  REST API</text>
      <text x="314" y="206" fill="#374151" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">batched PromQL · health aggregation</text>

      {/* ═══════════════════════════════════════════════════════════
          NODE — PROMETHEUS
          ═══════════════════════════════════════════════════════════ */}
      <rect x="654" y="118" width="180" height="88" rx="12" fill="url(#fill-default)" />
      <rect x="654" y="118" width="180" height="88" rx="12" fill="none" stroke="#1f2937" strokeWidth="1" />
      <rect x="654" y="118" width="180" height="88" rx="12" fill="none" stroke="#f79009" strokeWidth="0.8" opacity="0.2" />
      {/* Top accent */}
      <rect x="666" y="119" width="50" height="2" rx="1" fill="#f79009" opacity="0.45" />
      {/* Icon: chart bars */}
      <rect x="674" y="154" width="4" height="12" rx="2" fill="#f79009" opacity="0.5" />
      <rect x="681" y="148" width="4" height="18" rx="2" fill="#f79009" opacity="0.7" />
      <rect x="688" y="151" width="4" height="15" rx="2" fill="#f79009" opacity="0.6" />
      {/* Labels */}
      <text x="700" y="143" fill="#e5e5e5" fontSize="13" fontFamily="Outfit, system-ui"
        fontWeight="600" letterSpacing="0.01em">Prometheus</text>
      <text x="674" y="172" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">PromQL Engine · :9090</text>
      <text x="674" y="185" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">scrapes exporters</text>
      <text x="674" y="198" fill="#374151" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">IPMI · node · custom</text>

      {/* ═══════════════════════════════════════════════════════════
          NODE — FRONTEND
          ═══════════════════════════════════════════════════════════ */}
      <rect x="298" y="292" width="266" height="74" rx="12" fill="url(#fill-default)" />
      <rect x="298" y="292" width="266" height="74" rx="12" fill="none" stroke="#1f2937" strokeWidth="1" />
      <rect x="298" y="292" width="266" height="74" rx="12" fill="none" stroke="#465fff" strokeWidth="0.8" opacity="0.25" />
      {/* Bottom accent */}
      <rect x="310" y="363" width="50" height="2" rx="1" fill="#465fff" opacity="0.35" />
      {/* Icon: monitor */}
      <rect x="316" y="308" width="24" height="17" rx="3" fill="none" stroke="#465fff" strokeWidth="1.4" opacity="0.7" />
      <rect x="322" y="317" width="12" height="2" rx="1" fill="#465fff" opacity="0.35" />
      <line x1="328" y1="325" x2="328" y2="330" stroke="#465fff" strokeWidth="1.2" opacity="0.5" />
      <line x1="323" y1="330" x2="333" y2="330" stroke="#465fff" strokeWidth="1.2" opacity="0.5" />
      {/* Labels */}
      <text x="352" y="316" fill="#e5e5e5" fontSize="13" fontFamily="Outfit, system-ui"
        fontWeight="600" letterSpacing="0.01em">Frontend</text>
      <text x="352" y="332" fill="#7592ff" fontSize="11"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">React · :5173</text>
      <text x="316" y="352" fill="#4b5563" fontSize="9.5"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.02em">Physical Views  ·  Visual Editors  ·  Dashboards</text>
    </svg>
  );
}
