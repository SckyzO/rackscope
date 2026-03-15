/**
 * ArchDiagram — Rackscope architecture overview
 *
 * Premium dark-tech SVG. Zero dependencies. Docusaurus MDX compatible.
 * Draw order: bg → nodes → connections (on top) → labels (topmost).
 * Arrowheads: filled polygons (no SVG marker/gradient rendering bugs).
 */

export default function ArchDiagram() {
  return (
    <svg
      viewBox="0 0 900 420"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Rackscope architecture diagram"
      style={{
        width: '100%',
        maxWidth: 900,
        height: 'auto',
        display: 'block',
        margin: '2rem auto',
        borderRadius: 14,
      }}
    >
      <defs>
        <radialGradient id="D_bg" cx="48%" cy="45%" r="58%">
          <stop offset="0%" stopColor="#0d1a2e" />
          <stop offset="100%" stopColor="#030712" />
        </radialGradient>

        <pattern id="D_grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="0.8" cy="0.8" r="0.8" fill="#1a2535" opacity="0.9" />
        </pattern>

        <linearGradient id="D_card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111e33" />
          <stop offset="100%" stopColor="#0b1524" />
        </linearGradient>

        <linearGradient id="D_hub" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#162040" />
          <stop offset="100%" stopColor="#0d1a30" />
        </linearGradient>

        <filter id="D_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── 1. Background ──────────────────────────────────────────── */}
      <rect width="900" height="420" rx="14" fill="url(#D_bg)" />
      <rect width="900" height="420" rx="14" fill="url(#D_grid)" />
      <rect width="900" height="420" rx="14" fill="none" stroke="#1a2d4a" strokeWidth="1" />

      {/* Hub rings */}
      <ellipse cx="430" cy="180" rx="148" ry="96"
        fill="none" stroke="#465fff" strokeWidth="0.6" opacity="0.10" />
      <ellipse cx="430" cy="180" rx="175" ry="118"
        fill="none" stroke="#465fff" strokeWidth="0.3" opacity="0.05" />

      {/* ═══════════════════════════════════════════════════════════════
          ── 2. NODES (drawn before connections so arrows appear on top)
          Node geometry — all mid-y = 180, Backend/Frontend mid-x = 430:
            Config:     x=22,  y=128, w=160, h=100 → right=182, mid-y=178
            Backend:    x=310, y=128, w=240, h=100 → right=550, mid-y=178 (wider=hub)
            Prometheus: x=718, y=128, w=162, h=100 → left=718,  mid-y=178
            Frontend:   x=310, y=290, w=240, h=84  → top=290,   mid-x=430 (same width)
          ═══════════════════════════════════════════════════════════════ */}

      {/* ── YAML CONFIG ── */}
      <rect x="23" y="131" width="160" height="100" rx="10" fill="#000" opacity="0.3" />
      <rect x="22" y="128" width="160" height="100" rx="10" fill="url(#D_card)" />
      <rect x="22" y="128" width="160" height="100" rx="10"
        fill="none" stroke="#1e2d4e" strokeWidth="1" />
      {/* Icon: 3 YAML lines — centered with title y=164 (cap-center ≈ y=157) */}
      <rect x="38" y="151" width="20" height="2.5" rx="1.25" fill="#5571ff" opacity="0.95" />
      <rect x="38" y="157" width="15" height="2.5" rx="1.25" fill="#5571ff" opacity="0.6" />
      <rect x="38" y="163" width="18" height="2.5" rx="1.25" fill="#5571ff" opacity="0.4" />
      {/* Text */}
      <text x="66" y="163" fill="#e5e7eb" fontSize="13"
        fontFamily="Outfit, system-ui" fontWeight="600" letterSpacing="0.01em">
        YAML Config
      </text>
      <text x="38" y="184" fill="#4b5563" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">
        topology · templates
      </text>
      <text x="38" y="197" fill="#374151" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">
        checks · metrics
      </text>

      {/* ── BACKEND (HUB) ── */}
      <rect x="308" y="126" width="244" height="104" rx="13"
        fill="#465fff" opacity="0.04" filter="url(#D_glow)" />
      <rect x="311" y="131" width="240" height="100" rx="12" fill="#000" opacity="0.3" />
      <rect x="310" y="128" width="240" height="100" rx="12" fill="url(#D_hub)" />
      <rect x="310" y="128" width="240" height="100" rx="12"
        fill="none" stroke="#465fff" strokeWidth="1.2" opacity="0.55" />
      {/* Icon: hexagon — cap-center of 15px title at y=151 is ≈ y=146 */}
      <polygon
        points="336,144 344,140 352,144 352,152 344,156 336,152"
        fill="none" stroke="#5571ff" strokeWidth="1.5" opacity="0.85" />
      <circle cx="344" cy="148" r="3.5" fill="#465fff" opacity="0.7" />
      {/* Text */}
      <text x="362" y="151" fill="#f9fafb" fontSize="15"
        fontFamily="Outfit, system-ui" fontWeight="700" letterSpacing="0.01em">
        Backend
      </text>
      <text x="362" y="165" fill="#7592ff" fontSize="11"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">
        FastAPI · :8000
      </text>
      <line x1="326" y1="174" x2="534" y2="174" stroke="#1e2d4e" strokeWidth="1" />
      <text x="326" y="189" fill="#4b5563" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.025em">
        Health Engine  ·  Telemetry Planner
      </text>
      <text x="326" y="202" fill="#4b5563" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.025em">
        Plugin Registry  ·  REST API
      </text>
      <text x="326" y="215" fill="#374151" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.025em">
        batched PromQL  ·  health aggregation
      </text>

      {/* ── PROMETHEUS ── */}
      <rect x="719" y="131" width="162" height="100" rx="10" fill="#000" opacity="0.3" />
      <rect x="718" y="128" width="162" height="100" rx="10" fill="url(#D_card)" />
      <rect x="718" y="128" width="162" height="100" rx="10"
        fill="none" stroke="#1e2d4e" strokeWidth="1" />
      {/* Icon: bar chart — cap-center of 13px title at y=163 is ≈ y=158 */}
      <rect x="734" y="150" width="5" height="14" rx="2" fill="#f79009" opacity="0.5" />
      <rect x="742" y="145" width="5" height="19" rx="2" fill="#f79009" opacity="0.75" />
      <rect x="750" y="148" width="5" height="16" rx="2" fill="#f79009" opacity="0.6" />
      {/* Text */}
      <text x="764" y="163" fill="#e5e7eb" fontSize="13"
        fontFamily="Outfit, system-ui" fontWeight="600" letterSpacing="0.01em">
        Prometheus
      </text>
      <text x="734" y="181" fill="#4b5563" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">
        PromQL Engine · :9090
      </text>
      <text x="734" y="193" fill="#4b5563" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">
        scrapes exporters
      </text>
      <text x="734" y="205" fill="#374151" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">
        IPMI · node · custom
      </text>

      {/* ── FRONTEND ── */}
      <rect x="311" y="293" width="240" height="84" rx="10" fill="#000" opacity="0.3" />
      <rect x="310" y="290" width="240" height="84" rx="10" fill="url(#D_card)" />
      <rect x="310" y="290" width="240" height="84" rx="10"
        fill="none" stroke="#1e2d4e" strokeWidth="1" />
      {/* Icon: monitor — cap-center of 13px title at y=314 is ≈ y=309 */}
      <rect x="336" y="303" width="23" height="16" rx="3"
        fill="none" stroke="#5571ff" strokeWidth="1.4" opacity="0.75" />
      <rect x="342" y="311" width="11" height="2" rx="1" fill="#465fff" opacity="0.35" />
      <line x1="347.5" y1="319" x2="347.5" y2="323"
        stroke="#465fff" strokeWidth="1.3" opacity="0.45" />
      <line x1="343" y1="323" x2="352" y2="323"
        stroke="#465fff" strokeWidth="1.3" opacity="0.45" />
      {/* Text */}
      <text x="368" y="314" fill="#e5e7eb" fontSize="13"
        fontFamily="Outfit, system-ui" fontWeight="600" letterSpacing="0.01em">
        Frontend
      </text>
      <text x="368" y="328" fill="#7592ff" fontSize="11"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.03em">
        React · :5173
      </text>
      <text x="336" y="348" fill="#4b5563" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.025em">
        Physical Views  ·  Visual Editors
      </text>
      <text x="336" y="361" fill="#374151" fontSize="9"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.025em">
        Dashboards
      </text>

      {/* ═══════════════════════════════════════════════════════════════
          ── 3. CONNECTIONS (drawn AFTER nodes — appear on top)
          Gaps: 8px from each node edge.
          Config right=182 → gap → x=190 to x=302 → gap → Backend left=310
          Backend right=550 → gap → x=558 to x=710 → gap → Prom left=718
          Backend bottom=235 → gap → y=243 to y=282 → gap → Frontend top=290
          Label pills drawn above lines (+16px upward) to avoid covering arrows.
          ═══════════════════════════════════════════════════════════════ */}

      {/* ── Config ──► Backend ─────────────────────────────────────── */}
      <line x1="190" y1="178" x2="302" y2="178"
        stroke="#5571ff" strokeWidth="2.5" strokeOpacity="0.9" />
      {/* Arrowhead → */}
      <polygon points="291,172 303,178 291,184" fill="#5571ff" opacity="0.95" />
      {/* Label ABOVE the line (y=180-16=164, pill height 20 → top at 156) */}
      <rect x="211" y="156" width="60" height="20" rx="10"
        fill="#060e1c" stroke="#253d6a" strokeWidth="1.2" />
      <text x="241" y="170" fill="#7592ff" fontSize="10"
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight="500" textAnchor="middle" letterSpacing="0.06em">loads</text>

      {/* ── Backend ◄──► Prometheus ────────────────────────────────── */}
      <line x1="558" y1="178" x2="710" y2="178"
        stroke="#5571ff" strokeWidth="2.5" strokeOpacity="0.9" />
      {/* Arrowheads ← → */}
      <polygon points="569,172 557,178 569,184" fill="#5571ff" opacity="0.95" />
      <polygon points="699,172 711,178 699,184" fill="#5571ff" opacity="0.95" />
      {/* Label ABOVE */}
      <rect x="600" y="156" width="60" height="20" rx="10"
        fill="#060e1c" stroke="#253d6a" strokeWidth="1.2" />
      <text x="630" y="170" fill="#7592ff" fontSize="10"
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight="500" textAnchor="middle" letterSpacing="0.06em">PromQL</text>

      {/* ── Backend ◄──► Frontend ──────────────────────────────────── */}
      <line x1="430" y1="243" x2="430" y2="282"
        stroke="#5571ff" strokeWidth="2.5" strokeOpacity="0.9" />
      {/* Arrowheads ↑ ↓ */}
      <polygon points="424,254 430,242 436,254" fill="#5571ff" opacity="0.95" />
      <polygon points="424,271 430,283 436,271" fill="#5571ff" opacity="0.95" />
      {/* Label to the RIGHT of the line */}
      <rect x="443" y="253" width="76" height="20" rx="10"
        fill="#060e1c" stroke="#253d6a" strokeWidth="1.2" />
      <text x="481" y="267" fill="#7592ff" fontSize="10"
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight="500" textAnchor="middle" letterSpacing="0.06em">REST API</text>
    </svg>
  );
}
