import React, { useState, useEffect, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useColorMode } from '@docusaurus/theme-common';

// ── Dark tokens (Void palette — matches Rackscope app dark mode) ──────────────
const DARK = {
  indigo:        '#465fff',
  indigoLo:      'rgba(70,95,255,0.10)',
  indigoMd:      'rgba(70,95,255,0.22)',
  indigoBorder:  'rgba(70,95,255,0.32)',
  dark1:  '#0f1117',
  dark2:  '#13161f',
  dark3:  '#1a1d27',
  dark4:  '#21253a',
  textHi:  '#f0f2ff',
  textMid: '#9ba3c9',
  textLo:  '#5a6180',
  border:  'rgba(255,255,255,0.07)',
  borderMd:'rgba(255,255,255,0.12)',
  bgMuted: 'rgba(255,255,255,0.04)',
  // Hero title: gradient text in dark mode
  titleGradient: 'linear-gradient(135deg, #f0f2ff 40%, #465fff 100%)',
  isDark: true,
};

// ── Light tokens (Slate palette — matches Rackscope app light mode) ───────────
const LIGHT = {
  indigo:        '#465fff',
  indigoLo:      'rgba(70,95,255,0.06)',
  indigoMd:      'rgba(70,95,255,0.12)',
  indigoBorder:  'rgba(70,95,255,0.22)',
  dark1:  '#ffffff',     // main section bg → white
  dark2:  '#f3f4f6',    // alternating sections → light gray
  dark3:  '#ffffff',     // card surfaces → white
  dark4:  '#eef0f4',    // code tags, deep card elements
  textHi:  '#1a1714',   // warm dark (Slate primary)
  textMid: '#5c574f',   // warm medium (Slate secondary)
  textLo:  '#8a8479',   // warm muted (Slate muted)
  border:  'rgba(0,0,0,0.07)',
  borderMd:'rgba(0,0,0,0.10)',
  bgMuted: 'rgba(0,0,0,0.04)',
  // Hero title: plain indigo in light mode (gradient clip unreliable on large bold text)
  titleGradient: null,
  isDark: false,
};

// ── Token hook — returns the right palette based on current color mode ─────────
function useTokens() {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? DARK : LIGHT;
}

// ── Keyframes & hover utilities ───────────────────────────────────────────────
const KF = `
  @keyframes rs-fade-up {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes rs-glow-pulse {
    0%,100% { opacity:0.45; }
    50%      { opacity:1; }
  }
  @keyframes rs-slide {
    from { opacity:0; transform:translateX(16px); }
    to   { opacity:1; transform:translateX(0); }
  }
  .rs-a0 { animation: rs-fade-up 0.6s ease both 0.05s; }
  .rs-a1 { animation: rs-fade-up 0.6s ease both 0.15s; }
  .rs-a2 { animation: rs-fade-up 0.6s ease both 0.25s; }
  .rs-a3 { animation: rs-fade-up 0.6s ease both 0.35s; }
  .rs-a4 { animation: rs-fade-up 0.6s ease both 0.45s; }
  .rs-a5 { animation: rs-fade-up 0.8s ease both 0.55s; }
  .rs-slide { animation: rs-slide 0.4s ease both; }
  .rs-philocard { transition: border-color 0.2s, transform 0.2s; }
  .rs-philocard:hover { border-color: rgba(70,95,255,0.35) !important; transform: translateY(-2px); }
  .rs-pill-hover:hover { border-color: #465fff !important; color: #465fff !important; }
  .rs-cta-p:hover { background: #3248e0 !important; transform: translateY(-1px); }
  .rs-cta-g:hover { border-color: #465fff !important; color: #465fff !important; }
  .rs-dot:hover { background: #6a80ff !important; }
  .rs-arr:hover { background: rgba(70,95,255,0.25) !important; color: #fff !important; }
  .rs-qsl:hover { background: rgba(70,95,255,0.22) !important; }
`;

// ── Carousel slides ───────────────────────────────────────────────────────────
const SLIDE_DEFS = [
  { path: '/img/screenshots/rackscope-dashboard-overview.png', label: 'Analytics Dashboard', desc: 'Drag-and-drop widget grid with live health, alerts, world map and Prometheus stats' },
  { path: '/img/views/rackscope-datacenter-view.png',          label: 'Datacenter View',     desc: 'Site-level overview with room cards and mini rack grids' },
  { path: '/img/views/rackscope-room-style-standard.png',      label: 'Room Floor Plan',     desc: '10 rack styles — from standard color-coded cells to industrial heatmaps' },
  { path: '/img/views/rackscope-room-style-cells.png',         label: 'Cells Style',         desc: 'Proportional rack grid showing exact device layout and U occupancy' },
  { path: '/img/screenshots/rackscope-slurm-overview.png',     label: 'Slurm Integration',   desc: 'HPC workload manager — node states, partitions, wallboard mode' },
  { path: '/img/screenshots/rackscope-rack-view.png',          label: 'Rack View',           desc: 'Front and rear elevation with device placement and instance health' },
];

// ── Carousel component ────────────────────────────────────────────────────────
function Carousel() {
  const C = useTokens();
  const SLIDES = SLIDE_DEFS.map(s => ({ ...s, src: useBaseUrl(s.path) }));
  const [active, setActive] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const go = useCallback((idx) => {
    setActive(idx);
    setAnimKey(k => k + 1);
  }, []);

  const prev = () => go((active - 1 + SLIDES.length) % SLIDES.length);
  const next = () => go((active + 1) % SLIDES.length);

  useEffect(() => {
    const t = setTimeout(next, 5000);
    return () => clearTimeout(t);
  }, [active]);

  const slide = SLIDES[active];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Browser chrome */}
      <div style={{
        background: C.dark4, borderRadius: '12px 12px 0 0',
        padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        border: `1px solid ${C.borderMd}`, borderBottom: 'none',
      }}>
        {/* Traffic lights */}
        {['#ff5f56','#ffbd2e','#27c93f'].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.85, flexShrink: 0 }} />
        ))}
        {/* Address bar */}
        <div style={{
          flex: 1, maxWidth: 360, margin: '0 auto',
          background: C.dark3, borderRadius: 6,
          padding: '4px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${C.border}`,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textLo} strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.72rem', color: C.textMid, letterSpacing: '0.02em',
          }}>
            https://rackscope.dev/home
          </span>
        </div>
        {/* Slide label */}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem', color: C.textLo,
          marginLeft: 'auto',
        }}>
          {active + 1} / {SLIDES.length}
        </span>
      </div>

      {/* Image */}
      <div style={{
        border: `1px solid ${C.borderMd}`, borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden', position: 'relative',
        boxShadow: `0 32px 80px rgba(0,0,0,0.3), 0 0 60px ${C.indigoLo}`,
        background: '#1a1d27',  // always dark — screenshots show dark UI
        minHeight: 200,
      }}>
        <img
          key={animKey}
          src={slide.src}
          alt={`Rackscope — ${slide.label}`}
          className="rs-slide"
          style={{ display: 'block', width: '100%', height: 'auto' }}
          onError={e => { e.target.style.minHeight = '320px'; }}
        />
        {/* Prev / Next arrows */}
        <button onClick={prev}
          className="rs-arr"
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(15,17,23,0.7)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#9ba3c9', cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}>‹</button>
        <button onClick={next}
          className="rs-arr"
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(15,17,23,0.7)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#9ba3c9', cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}>›</button>
        {/* Caption overlay — always dark since it sits on top of dark screenshots */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '24px 20px 16px',
          background: 'linear-gradient(transparent, rgba(15,17,23,0.9))',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, color: '#f0f2ff', fontSize: '0.9rem', marginBottom: 3 }}>{slide.label}</div>
          <div style={{ color: '#9ba3c9', fontSize: '0.8rem', lineHeight: 1.4 }}>{slide.desc}</div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)}
            className="rs-dot"
            style={{
              width: i === active ? 24 : 8, height: 8, borderRadius: 999,
              background: i === active ? C.indigo : C.dark4,
              border: `1px solid ${i === active ? C.indigo : C.borderMd}`,
              cursor: 'pointer', padding: 0,
              transition: 'all 0.25s',
            }} />
        ))}
      </div>
    </div>
  );
}

// ── Page content — must be rendered inside <Layout> so ColorModeProvider exists ─

// Realistic alert path — shows the drill-down concept with a concrete example.
// Each node reveals sequentially (stagger animation), CRIT pulses at the end.
const PATH = [
  { name: 'Paris HPC',      level: 'Site'     },
  { name: 'Machine Room A', level: 'Room'     },
  { name: 'Compute Aisle',  level: 'Aisle'    },
  { name: 'Rack C04',       level: 'Rack'     },
  { name: 'compute-042',    level: 'Instance', crit: true },
];

function HomeContent() {
  const C = useTokens();
  return (
    <>
      <style>{KF}</style>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(180deg, ${C.dark1} 0%, ${C.dark2} 100%)`,
        borderBottom: `1px solid ${C.border}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 100%)',
        }} />
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: `radial-gradient(ellipse, ${C.indigoMd} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '88px 24px 80px', position: 'relative', textAlign: 'center' }}>
          {/* Badge */}
          <div className="rs-a0" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', background: C.indigoLo, border: `1px solid ${C.indigoBorder}`,
            borderRadius: 999, marginBottom: 28,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: C.indigo,
              boxShadow: `0 0 6px ${C.indigo}`, animation: 'rs-glow-pulse 2s ease infinite',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:C.indigo, letterSpacing:'0.08em', fontWeight:600 }}>
              Open Source · AGPL-3.0
            </span>
          </div>

          <h1 className="rs-a1" style={{
            fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', fontWeight: 800, margin: '0 0 16px',
            letterSpacing: '-0.04em', lineHeight: 1.08,
            // Dark: gradient text (light→indigo). Light: plain indigo (gradient clip unreliable on large bold text)
            ...(C.isDark
              ? { background: C.titleGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
              : { color: C.indigo }
            ),
          }}>
            Rackscope
          </h1>

          <p className="rs-a2" style={{ fontSize:'clamp(1rem,2.5vw,1.25rem)', fontWeight:500, color:C.textMid, margin:'0 0 20px', letterSpacing:'-0.01em' }}>
            Prometheus-first physical infrastructure monitoring
          </p>

          <p className="rs-a3" style={{ fontSize:'1rem', color:C.textLo, lineHeight:1.75, maxWidth:580, margin:'0 auto 36px' }}>
            When an alert fires, monitoring tools indicate what is wrong — but rarely where the problem is located in the physical infrastructure.
            Rackscope provides that physical context, mapping every metric to its exact location:
            site, datacenter, room, aisle, rack, device, instance.
          </p>

          <div className="rs-a4" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:40 }}>
            <Link to="/getting-started/quick-start" className="rs-cta-p" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'11px 26px', background:C.indigo, color:'#fff',
              borderRadius:8, fontWeight:700, fontSize:'0.95rem',
              textDecoration:'none', letterSpacing:'-0.01em',
              transition:'background 0.15s, transform 0.15s',
              boxShadow:`0 0 24px ${C.indigoMd}`,
            }}>
              Get Started →
            </Link>
            <Link to="https://github.com/SckyzO/rackscope" className="rs-cta-g" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'11px 26px', background:'transparent', color:C.textMid,
              border:`1px solid ${C.borderMd}`, borderRadius:8,
              fontWeight:600, fontSize:'0.95rem', textDecoration:'none',
              transition:'border-color 0.15s, color 0.15s',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Link>
          </div>

          {/* Hierarchy path — B+C mix: realistic alert path + stagger reveal */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:0, justifyContent:'center', flexWrap:'wrap', rowGap:12 }}>
            {PATH.map(({ name, level, crit }, i) => (
              <React.Fragment key={name}>
                {/* Separator — appears with the same delay as the following node */}
                {i > 0 && (
                  <span style={{
                    color: C.textLo, fontSize:'0.75rem', margin:'0 5px',
                    userSelect:'none', paddingTop:6,
                    animation:`rs-fade-up 0.45s ease both ${0.52 + i * 0.12}s`,
                  }}>›</span>
                )}
                {/* Node — name pill + level label */}
                <div style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  animation:`rs-fade-up 0.45s ease both ${0.46 + i * 0.12}s`,
                }}>
                  {/* Name pill */}
                  <div style={{
                    display:'flex', alignItems:'center', gap:6,
                    fontFamily:"'JetBrains Mono',monospace", fontSize:'0.78rem', fontWeight:600,
                    color: crit ? '#ef4444' : i===0 ? C.indigo : C.textHi,
                    padding:'4px 11px', borderRadius:6,
                    background: crit ? 'rgba(239,68,68,0.10)' : i===0 ? C.indigoLo : 'transparent',
                    border:`1px solid ${crit ? 'rgba(239,68,68,0.25)' : i===0 ? C.indigoBorder : C.border}`,
                    letterSpacing:'-0.01em',
                  }}>
                    {name}
                    {crit && (
                      <>
                        <span style={{
                          width:5, height:5, borderRadius:'50%',
                          background:'#ef4444', display:'inline-block', flexShrink:0,
                          animation:'rs-glow-pulse 1.5s ease infinite',
                        }}/>
                        <span style={{
                          fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.06em',
                          color:'#ef4444', animation:'rs-glow-pulse 1.5s ease infinite',
                        }}>CRIT</span>
                      </>
                    )}
                  </div>
                  {/* Level label */}
                  <span style={{
                    fontSize:'0.6rem', color:C.textLo, letterSpacing:'0.10em',
                    textTransform:'uppercase', fontFamily:"'JetBrains Mono',monospace",
                    fontWeight:500,
                  }}>{level}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── CAROUSEL ─────────────────────────────────────────────────────── */}
      <div style={{ background:C.dark2, padding:'56px 24px 64px', borderBottom:`1px solid ${C.border}` }}>
        <Carousel />
      </div>

      {/* ── PHILOSOPHY ───────────────────────────────────────────────────── */}
      <div style={{ background:C.dark1, padding:'72px 24px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:C.indigo, letterSpacing:'0.12em', fontWeight:600, textTransform:'uppercase', marginBottom:12 }}>
              Design Philosophy
            </div>
            <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.03em', color:C.textHi, margin:'0 0 12px' }}>
              See your infrastructure,<br />not your spreadsheets.
            </h2>
            <p style={{ color:C.textLo, fontSize:'0.95rem', margin:0, maxWidth:480, marginInline:'auto' }}>
              Three principles that are non-negotiable.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20 }}>
            {[
              { icon:'📄', title:'Zero Database', delay:'0.1s', desc:'All configuration is stored in YAML files — GitOps-compatible, version-controlled, and diff-friendly. Commit your infrastructure topology to Git and roll back with a single command.' },
              { icon:'📡', title:'Prometheus-Only', delay:'0.2s', desc:'Every health state derives from a live PromQL query against your existing Prometheus instance. No agents, no collectors, no additional telemetry infrastructure to operate.' },
              { icon:'🏗️', title:'Physical Hierarchy', delay:'0.3s', desc:'Site → Room → Aisle → Rack → Device → Instance. Health states propagate upward — a failing node elevates its rack to CRIT, which propagates to the room level.' },
            ].map(({ icon, title, desc, delay }) => (
              <div key={title} className="rs-philocard" style={{
                animationDelay:delay, padding:'28px 28px 24px',
                background:C.dark3, border:`1px solid ${C.border}`,
                borderRadius:12, position:'relative', overflow:'hidden',
              }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${C.indigo}, transparent)`, opacity:0.6 }} />
                <div style={{ fontSize:'1.6rem', marginBottom:14 }}>{icon}</div>
                <h3 style={{ margin:'0 0 10px', fontSize:'1rem', fontWeight:700, color:C.textHi, letterSpacing:'-0.01em' }}>{title}</h3>
                <p style={{ margin:0, fontSize:'0.9rem', lineHeight:1.65, color:C.textMid }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BLOC 1 : ZOOM IN ─────────────────────────────────────────────── */}
      <div style={{ background:C.dark2, padding:'80px 24px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:C.indigo, letterSpacing:'0.12em', fontWeight:600, textTransform:'uppercase', marginBottom:12 }}>
              Physical drill-down
            </div>
            <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.03em', color:C.textHi, margin:'0 0 12px' }}>
              Zoom in. All the way.
            </h2>
            <p style={{ color:C.textLo, fontSize:'0.95rem', margin:0, maxWidth:480, marginInline:'auto' }}>
              Every alert is anchored to a precise physical location. Navigate progressively from a global overview to the exact device — at each level, only the relevant information is displayed.
            </p>
          </div>

          {/* Inverted pyramid */}
          {(() => {
            const DRILL = [
              { level:'Global',      w:800, desc:'All sites — health summary, world map, active alerts',                tooltip:'The entry point. See every site at a glance, active alert count, and global health status.', icon:'🌍' },
              { level:'Datacenter',  w:700, desc:'Site-level overview — rooms, live status, drill-down',                tooltip:'One card per datacenter. Rooms, rack count, and health badge — click to enter.',          icon:'🏢' },
              { level:'Room',        w:606, desc:'Floor plan — aisle layout, rack grid, health heatmap',                tooltip:'Interactive floor plan. 10 rack styles — from color cells to thermal heatmaps.',          icon:'🗺️' },
              { level:'Aisle',       w:510, desc:'Row of racks — aisle state, cooling zones',                           tooltip:'Racks grouped by aisle. Aggregate severity badge. Ideal for NOC wallboard mode.',         icon:'🔲' },
              { level:'Rack',        w:415, desc:'Front/rear elevation — device placement, U occupancy',                tooltip:'Front and rear views. Drag-and-drop editor. Template-driven device placement.',            icon:'🖥️' },
              { level:'Device',      w:320, desc:'Chassis or unit — instances, checks, live metrics',                   tooltip:'Each device has instances (nodes), health checks, and optional metric charts.',           icon:'⚡' },
              { level:'Instance',    w:225, desc:'Single node — health state, check results',                           tooltip:'The leaf level. One check result per PromQL expression. OK / WARN / CRIT / UNKNOWN.',    icon:'🔬' },
            ];
            const [hov, setHov] = React.useState(-1);
            return (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                {DRILL.map(({ level, w, desc, tooltip, icon }, i) => (
                  <div key={level} style={{ width:'100%', maxWidth:w, position:'relative' }}
                    onMouseEnter={() => setHov(i)}
                    onMouseLeave={() => setHov(-1)}
                  >
                    <div style={{
                      padding:'11px 18px',
                      background: hov === i
                        ? (i === 0 ? `linear-gradient(90deg, rgba(70,95,255,0.35), rgba(70,95,255,0.15))` : 'rgba(70,95,255,0.1)')
                        : (i === 0 ? `linear-gradient(90deg, ${C.indigoMd}, ${C.indigoLo})` : i === 6 ? C.dark4 : C.dark3),
                      border:`1px solid ${hov === i || i === 0 ? C.indigoBorder : C.border}`,
                      borderLeft: hov === i ? `3px solid ${C.indigo}` : `1px solid ${hov === i || i === 0 ? C.indigoBorder : C.border}`,
                      borderRadius:8,
                      display:'flex', alignItems:'center', gap:12,
                      transition:'all 0.18s',
                      transform: hov === i ? 'translateX(3px)' : 'translateX(0)',
                      cursor:'default',
                      boxShadow: hov === i ? `0 4px 24px rgba(70,95,255,0.15)` : 'none',
                    }}>
                      <span style={{ fontSize:'1rem', flexShrink:0 }}>{icon}</span>
                      <div style={{ flex:1, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', minWidth:0 }}>
                        <span style={{
                          fontWeight:700, fontSize:'0.85rem',
                          color: i === 0 || hov === i ? C.textHi : C.textMid,
                          flexShrink:0,
                          fontFamily:"'JetBrains Mono',monospace",
                          letterSpacing:'0.02em',
                          transition:'color 0.18s',
                        }}>{level}</span>
                        <span style={{ fontSize:'0.8rem', color: hov === i ? C.textMid : C.textLo, lineHeight:1.4, transition:'color 0.18s' }}>{desc}</span>
                      </div>
                      {i === 0 && (
                        <span style={{
                          fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem',
                          color:C.indigo, background:C.indigoLo,
                          border:`1px solid ${C.indigoBorder}`,
                          borderRadius:4, padding:'2px 8px', flexShrink:0,
                        }}>start here</span>
                      )}
                    </div>
                    {/* Tooltip */}
                    {hov === i && (
                      <div style={{
                        position:'absolute', left:'calc(100% + 12px)', top:'50%',
                        transform:'translateY(-50%)',
                        width:220, padding:'10px 14px',
                        background:C.dark4, border:`1px solid ${C.indigoBorder}`,
                        borderRadius:8, zIndex:10,
                        boxShadow:`0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px ${C.indigoBorder}`,
                        pointerEvents:'none',
                      }}>
                        <div style={{ fontSize:'0.75rem', color:C.textMid, lineHeight:1.55 }}>{tooltip}</div>
                        <div style={{
                          position:'absolute', left:-6, top:'50%',
                          width:10, height:10, background:C.dark4,
                          border:`1px solid ${C.indigoBorder}`, borderRight:'none', borderTop:'none',
                          transform:'translateY(-50%) rotate(45deg)',
                        }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── BLOC 2 : ANY METRIC ANY TEAM ────────────────────────────────── */}
      <div style={{ background:C.dark1, padding:'80px 24px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:C.indigo, letterSpacing:'0.12em', fontWeight:600, textTransform:'uppercase', marginBottom:12 }}>
              Universal by design
            </div>
            <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.03em', color:C.textHi, margin:'0 0 12px' }}>
              Any metric. Any team.
            </h2>
            <p style={{ color:C.textLo, fontSize:'0.95rem', margin:0, maxWidth:520, marginInline:'auto' }}>
              Any metric exposed in Prometheus can become a visible health check in Rackscope — whether it originates from hardware, software, network infrastructure, or HPC workloads.
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:24, alignItems:'start' }}>
            {/* Hardware */}
            <div style={{ padding:'28px', background:C.dark3, border:`1px solid ${C.border}`, borderRadius:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <span style={{ fontSize:'1.4rem' }}>🔩</span>
                <div>
                  <div style={{ fontWeight:700, color:C.textHi, fontSize:'1rem' }}>Hardware teams</div>
                  <div style={{ color:C.textLo, fontSize:'0.8rem' }}>Physical infrastructure</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  ['Server / rack down', 'ipmi_up, node_up'],
                  ['Temperature & cooling', 'ipmi_temperature'],
                  ['PDU load & power', 'pdu_total_load_watts'],
                  ['InfiniBand / network', 'ib_port_state'],
                  ['Storage health', 'eseries_drive_status'],
                  ['Liquid cooling leaks', 'sequana3_leak_sensor'],
                ].map(([label, tag]) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:C.indigo, flexShrink:0 }} />
                      <span style={{ fontSize:'0.85rem', color:C.textMid }}>{label}</span>
                    </div>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color:C.textLo, background:C.dark4, padding:'2px 7px', borderRadius:4, flexShrink:0 }}>{tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Center — PromQL */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingTop:32 }}>
              <div style={{ width:1, flex:1, background:C.border }} />
              <div style={{
                width:48, height:48, borderRadius:'50%',
                background:C.indigoLo, border:`2px solid ${C.indigoBorder}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:"'JetBrains Mono',monospace", fontSize:'0.65rem',
                color:C.indigo, fontWeight:700, letterSpacing:'0.05em',
                textAlign:'center', lineHeight:1.3, flexShrink:0,
              }}>Prom<br/>QL</div>
              <div style={{ width:1, flex:1, background:C.border }} />
            </div>

            {/* Software */}
            <div style={{ padding:'28px', background:C.dark3, border:`1px solid ${C.border}`, borderRadius:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <span style={{ fontSize:'1.4rem' }}>💻</span>
                <div>
                  <div style={{ fontWeight:700, color:C.textHi, fontSize:'1rem' }}>Software teams</div>
                  <div style={{ color:C.textLo, fontSize:'0.8rem' }}>Services & applications</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  ['Service availability', 'up{job="myapp"}'],
                  ['Critical app alerts', 'custom_error_rate'],
                  ['Slurm node states', 'slurm_node_status'],
                  ['Job queue depth', 'slurm_jobs_pending'],
                  ['Any custom exporter', 'any_metric{...}'],
                  ['Plugin system', 'extensible'],
                ].map(([label, tag]) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', flexShrink:0 }} />
                      <span style={{ fontSize:'0.85rem', color:C.textMid }}>{label}</span>
                    </div>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color:C.textLo, background:C.dark4, padding:'2px 7px', borderRadius:4, flexShrink:0 }}>{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CMDB-agnostic note */}
          <div style={{
            marginTop:24, padding:'16px 20px',
            background:C.dark3, border:`1px solid ${C.border}`,
            borderRadius:10,
          }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <span style={{ fontSize:'1rem', flexShrink:0, marginTop:'2px' }}>⚡</span>
              <div style={{ fontSize:'0.875rem', color:C.textMid, lineHeight:1.65 }}>
                <strong style={{ color:C.textHi }}>CMDB-agnostic.</strong>
                {'  '} Generate your YAML topology from NetBox, RacksDB, any script, or use the API directly. No vendor lock-in — if your tools can write a file, Rackscope can read it.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BLOC 3 : THE MISSING LAYER ───────────────────────────────────── */}
      <div style={{ background:C.dark2, padding:'80px 24px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:C.indigo, letterSpacing:'0.12em', fontWeight:600, textTransform:'uppercase', marginBottom:12 }}>
              Positioning
            </div>
            <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.03em', color:C.textHi, margin:'0 0 12px' }}>
              The physical layer that was missing.
            </h2>
            <p style={{ color:C.textLo, fontSize:'0.95rem', margin:0, maxWidth:500, marginInline:'auto' }}>
              Rackscope does not replace existing tools. It fills the gap between metrics dashboards and supervision platforms — adding the physical location of every alert to the monitoring chain.
            </p>
          </div>

          {/* Bridge diagram */}
          <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>
            {/* Grafana */}
            <div style={{
              flex:1, padding:'24px 20px',
              background:C.dark3, border:`1px solid ${C.border}`,
              borderRadius:'10px 0 0 10px',
              display:'flex', flexDirection:'column', gap:8,
            }}>
              <div style={{ fontSize:'1.3rem' }}>📊</div>
              <div style={{ fontWeight:700, color:C.textMid, fontSize:'0.9rem' }}>Grafana</div>
              <div style={{ fontSize:'0.8rem', color:C.textLo, lineHeight:1.5 }}>Metrics & dashboards. Charts, panels, time series. Indicates <em>what</em> is happening.</div>
              <div style={{
                marginTop:'auto', padding:'6px 10px',
                background:C.bgMuted, borderRadius:6,
                fontSize:'0.75rem', color:C.textLo, fontStyle:'italic',
              }}>
                "cpu_usage is 95%"
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display:'flex', alignItems:'center', padding:'0 4px', background:C.dark2, zIndex:1 }}>
              <div style={{ color:C.textLo, fontSize:'1.2rem', lineHeight:1 }}>→</div>
            </div>

            {/* Rackscope — highlighted */}
            <div style={{
              flex:'1.4', padding:'24px 24px',
              background: `linear-gradient(135deg, ${C.dark3}, ${C.dark4})`,
              border:`2px solid ${C.indigoBorder}`,
              display:'flex', flexDirection:'column', gap:8,
              position:'relative', zIndex:2,
              boxShadow:`0 0 40px ${C.indigoLo}`,
            }}>
              <div style={{
                position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)',
                background:C.indigo, color:'#fff',
                fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.08em',
                padding:'3px 12px', borderRadius:999,
                fontFamily:"'JetBrains Mono',monospace",
              }}>RACKSCOPE</div>
              <div style={{ fontSize:'1.3rem' }}>🔭</div>
              <div style={{ fontWeight:700, color:C.textHi, fontSize:'0.9rem' }}>Physical context</div>
              <div style={{ fontSize:'0.8rem', color:C.textMid, lineHeight:1.5 }}>Bridges metrics to physical location. Answers <em>where</em> — which rack, which aisle, which room.</div>
              <div style={{
                marginTop:'auto', padding:'6px 10px',
                background:C.indigoLo, border:`1px solid ${C.indigoBorder}`,
                borderRadius:6, fontSize:'0.75rem', color:C.indigo, fontStyle:'italic',
              }}>
                "Rack C04, Aisle 2, Machine Room A"
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display:'flex', alignItems:'center', padding:'0 4px', background:C.dark2, zIndex:1 }}>
              <div style={{ color:C.textLo, fontSize:'1.2rem', lineHeight:1 }}>→</div>
            </div>

            {/* Supervision */}
            <div style={{
              flex:1, padding:'24px 20px',
              background:C.dark3, border:`1px solid ${C.border}`,
              borderRadius:'0 10px 10px 0',
              display:'flex', flexDirection:'column', gap:8,
            }}>
              <div style={{ fontSize:'1.3rem' }}>🚨</div>
              <div style={{ fontWeight:700, color:C.textMid, fontSize:'0.9rem' }}>Supervision</div>
              <div style={{ fontSize:'0.8rem', color:C.textLo, lineHeight:1.5 }}>Full monitoring & alerting. Nagios, Zabbix, PagerDuty. Determines <em>what action to take</em>.</div>
              <div style={{
                marginTop:'auto', padding:'6px 10px',
                background:C.bgMuted, borderRadius:6,
                fontSize:'0.75rem', color:C.textLo, fontStyle:'italic',
              }}>
                "Ticket #4821 opened"
              </div>
            </div>
          </div>

          <p style={{ textAlign:'center', marginTop:24, color:C.textLo, fontSize:'0.85rem', fontStyle:'italic' }}>
            Not a replacement. The intermediate layer that was missing between your metrics dashboards and your supervision platform.
          </p>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <div style={{ background:C.dark1, padding:'80px 24px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:C.indigo, letterSpacing:'0.12em', fontWeight:600, textTransform:'uppercase', marginBottom:12 }}>
              How it works
            </div>
            <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.03em', color:C.textHi, margin:'0 0 12px' }}>
              From Prometheus to physical view
            </h2>
            <p style={{ color:C.textLo, fontSize:'0.95rem', margin:0, maxWidth:520, marginInline:'auto' }}>
              Four steps — from your existing infrastructure to a live physical view.
              No agent to deploy, no database to provision.
            </p>
          </div>

          {/* 4 steps */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:2, marginBottom:64, position:'relative' }}>
            {[
              { num:'01', icon:'📄', title:'Define your topology', desc:'Write YAML files describing your physical infrastructure — sites, rooms, aisles, racks, devices. Or generate them from NetBox, RacksDB, any script, or the API.', tag:'topology.yaml' },
              { num:'02', icon:'📡', title:'Connect Prometheus', desc:"One URL. Point Rackscope at your existing Prometheus instance. No collector to deploy, no agent to install, nothing to change in your stack.", tag:'prometheus_url:' },
              { num:'03', icon:'🔗', title:'Map your checks', desc:'Any metric with the right labels becomes a visible health check. IPMI temperature, PDU load, software service status, Slurm node state — anything Prometheus scrapes.', tag:'expr: up{...}' },
              { num:'04', icon:'🔭', title:'See your infrastructure', desc:"Launch and navigate from global to instance level. When something is CRIT, you know exactly which rack, which aisle, which room — not just a hostname in an alert.", tag:'make up' },
            ].map(({ num, icon, title, desc, tag }, i) => (
              <div key={num} style={{
                padding:'28px 24px',
                background:C.dark3,
                borderRadius: i===0 ? '10px 0 0 10px' : i===3 ? '0 10px 10px 0' : 0,
                border:`1px solid ${C.border}`,
                borderLeft: i>0 ? 'none' : `1px solid ${C.border}`,
                position:'relative',
                display:'flex', flexDirection:'column', gap:12,
              }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', fontWeight:700, color:C.textLo, letterSpacing:'0.1em' }}>
                  {num}
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <span style={{ fontSize:'1.3rem', flexShrink:0, marginTop:1 }}>{icon}</span>
                  <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:700, color:C.textHi, letterSpacing:'-0.01em', lineHeight:1.3 }}>{title}</h3>
                </div>
                <p style={{ margin:0, fontSize:'0.85rem', lineHeight:1.65, color:C.textMid, flex:1 }}>{desc}</p>
                <div style={{
                  fontFamily:"'JetBrains Mono',monospace",
                  fontSize:'0.72rem', color:C.indigo,
                  background:C.indigoLo, border:`1px solid ${C.indigoBorder}`,
                  borderRadius:5, padding:'3px 10px', display:'inline-block',
                  alignSelf:'flex-start',
                }}>{tag}</div>
                {i < 3 && (
                  <div style={{
                    position:'absolute', right:-12, top:'50%',
                    transform:'translateY(-50%)',
                    width:24, height:24,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background:C.dark2, border:`1px solid ${C.border}`,
                    borderRadius:'50%', zIndex:1,
                    color:C.textLo, fontSize:'0.75rem',
                  }}>→</div>
                )}
              </div>
            ))}
          </div>

          {/* Doc cards */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <p style={{ color:C.textLo, fontSize:'0.9rem', margin:0 }}>
              The documentation covers everything in detail. Start where it makes sense for you.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:14 }}>
            {[
              { icon:'🚀', label:'Quick Start', sub:'Up in 5 minutes',          desc:'Clone, configure, launch. Full step-by-step with prerequisites.',                         to:'/getting-started/quick-start' },
              { icon:'📦', label:'Examples',    sub:'Ready-made topologies',    desc:'From a simple 4-rack lab to an 855-node HPC cluster. Load in one command.',             to:'/getting-started/examples' },
              { icon:'⚙️', label:'Admin Guide', sub:'Production deployment',    desc:'Docker images, GHCR, nginx, config reference, app.yaml explained.',                     to:'/admin-guide/deployment' },
              { icon:'🔌', label:'API Reference', sub:'Automate & integrate',   desc:'Generate topology from scripts, push checks, query health states.',                     to:'/api-reference/overview' },
            ].map(({ icon, label, sub, desc, to }) => (
              <Link key={label} to={to}
                style={{
                  display:'flex', flexDirection:'column', gap:8,
                  padding:'20px 20px 16px',
                  background:C.dark3, border:`1px solid ${C.border}`,
                  borderRadius:10, textDecoration:'none',
                  transition:'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=C.indigoBorder; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform='translateY(0)'; }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:'1.2rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight:700, color:C.textHi, fontSize:'0.9rem' }}>{label}</div>
                    <div style={{ color:C.indigo, fontSize:'0.75rem', fontFamily:"'JetBrains Mono',monospace" }}>{sub}</div>
                  </div>
                </div>
                <p style={{ margin:0, fontSize:'0.82rem', lineHeight:1.55, color:C.textMid }}>{desc}</p>
                <div style={{ color:C.indigo, fontSize:'0.8rem', fontWeight:600, marginTop:'auto' }}>Read →</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAGE FOOTER ──────────────────────────────────────────────────── */}
      <div style={{
        background: C.dark2,
        borderTop: `1px solid ${C.border}`,
        padding: '24px',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:C.textLo, letterSpacing:'0.04em' }}>
            Rackscope · AGPL-3.0
          </span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:C.textLo, letterSpacing:'0.04em', fontStyle:'italic' }}>
            Not another Grafana plugin.
          </span>
          <div style={{ display:'flex', gap:16 }}>
            {[
              { label:'GitHub', to:'https://github.com/SckyzO/rackscope' },
              { label:'Quick Start', to:'/getting-started/quick-start' },
              { label:'API', to:'/api-reference/overview' },
            ].map(({ label, to }) => (
              <Link key={label} to={to} className="rs-pill-hover" style={{
                fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem',
                color:C.textLo, textDecoration:'none',
                padding:'4px 10px', borderRadius:5,
                border:`1px solid transparent`,
                transition:'border-color 0.15s, color 0.15s',
                letterSpacing:'0.04em',
              }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root export — Layout wrapper only, no hooks here ─────────────────────────
export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomeContent />
    </Layout>
  );
}
