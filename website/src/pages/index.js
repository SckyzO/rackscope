import React, { useState, useEffect, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
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
};

// ── Keyframes ─────────────────────────────────────────────────────────────────
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
  .rs-pill-hover:hover { border-color: #465fff !important; color: #f0f2ff !important; }
  .rs-cta-p:hover { background: #3248e0 !important; transform: translateY(-1px); }
  .rs-cta-g:hover { border-color: #465fff !important; color: #f0f2ff !important; }
  .rs-dot:hover { background: #6a80ff !important; }
  .rs-arr:hover { background: rgba(70,95,255,0.25) !important; color: #f0f2ff !important; }
  .rs-qsl:hover { background: rgba(70,95,255,0.22) !important; }
`;

// ── Carousel slides (raw paths — resolved with useBaseUrl inside Carousel) ────
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
  // Resolve paths with base URL (needed when served at /docs/ via nginx)
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
        background: T.dark4, borderRadius: '12px 12px 0 0',
        padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        border: `1px solid ${T.borderMd}`, borderBottom: 'none',
      }}>
        {/* Traffic lights */}
        {['#ff5f56','#ffbd2e','#27c93f'].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.85, flexShrink: 0 }} />
        ))}
        {/* Address bar */}
        <div style={{
          flex: 1, maxWidth: 360, margin: '0 auto',
          background: T.dark3, borderRadius: 6,
          padding: '4px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textLo} strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.72rem', color: T.textMid, letterSpacing: '0.02em',
          }}>
            https://rackscope.dev/home
          </span>
        </div>
        {/* Slide label */}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem', color: T.textLo,
          marginLeft: 'auto',
        }}>
          {active + 1} / {SLIDES.length}
        </span>
      </div>

      {/* Image */}
      <div style={{
        border: `1px solid ${T.borderMd}`, borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden', position: 'relative',
        boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(70,95,255,0.12)`,
        background: T.dark3,
        minHeight: 200,
      }}>
        <img
          key={animKey}
          src={slide.src}
          alt={`Rackscope — ${slide.label}`}
          className="rs-slide"
          style={{ display: 'block', width: '100%', height: 'auto' }}
          onError={e => { e.target.style.minHeight = '320px'; e.target.style.background = T.dark3; }}
        />
        {/* Prev / Next arrows */}
        <button onClick={prev}
          className="rs-arr"
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(15,17,23,0.7)', border: `1px solid ${T.borderMd}`,
            color: T.textMid, cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}>‹</button>
        <button onClick={next}
          className="rs-arr"
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(15,17,23,0.7)', border: `1px solid ${T.borderMd}`,
            color: T.textMid, cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}>›</button>
        {/* Caption overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '24px 20px 16px',
          background: 'linear-gradient(transparent, rgba(15,17,23,0.9))',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, color: T.textHi, fontSize: '0.9rem', marginBottom: 3 }}>{slide.label}</div>
          <div style={{ color: T.textMid, fontSize: '0.8rem', lineHeight: 1.4 }}>{slide.desc}</div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)}
            className="rs-dot"
            style={{
              width: i === active ? 24 : 8, height: 8, borderRadius: 999,
              background: i === active ? T.indigo : T.dark4,
              border: `1px solid ${i === active ? T.indigo : T.borderMd}`,
              cursor: 'pointer', padding: 0,
              transition: 'all 0.25s',
            }} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const LEVELS = ['Site','Room','Aisle','Rack','Device','Instance'];

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <style>{KF}</style>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(180deg, ${T.dark1} 0%, ${T.dark2} 100%)`,
        borderBottom: `1px solid ${T.border}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 100%)',
        }} />
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: `radial-gradient(ellipse, ${T.indigoMd} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '88px 24px 80px', position: 'relative', textAlign: 'center' }}>
          {/* Badge */}
          <div className="rs-a0" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', background: T.indigoLo, border: `1px solid ${T.indigoBorder}`,
            borderRadius: 999, marginBottom: 28,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: T.indigo,
              boxShadow: `0 0 6px ${T.indigo}`, animation: 'rs-glow-pulse 2s ease infinite',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:T.indigo, letterSpacing:'0.08em', fontWeight:600 }}>
              Open Source · AGPL-3.0
            </span>
          </div>

          <h1 className="rs-a1" style={{
            fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', fontWeight: 800, margin: '0 0 16px',
            letterSpacing: '-0.04em', lineHeight: 1.08,
            background: `linear-gradient(135deg, ${T.textHi} 40%, ${T.indigo} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Rackscope
          </h1>

          <p className="rs-a2" style={{ fontSize:'clamp(1rem,2.5vw,1.25rem)', fontWeight:500, color:T.textMid, margin:'0 0 20px', letterSpacing:'-0.01em' }}>
            Prometheus-first physical infrastructure monitoring
          </p>

          <p className="rs-a3" style={{ fontSize:'1rem', color:T.textLo, lineHeight:1.75, maxWidth:580, margin:'0 auto 36px' }}>
            A visualization layer for data centers and HPC environments.
            Powered entirely by live PromQL queries — no internal time-series database,
            no agents, no CMDB ownership. Your Prometheus, your topology, your rules.
          </p>

          <div className="rs-a4" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:40 }}>
            <Link to="/getting-started/quick-start" className="rs-cta-p" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'11px 26px', background:T.indigo, color:'#fff',
              borderRadius:8, fontWeight:700, fontSize:'0.95rem',
              textDecoration:'none', letterSpacing:'-0.01em',
              transition:'background 0.15s, transform 0.15s',
              boxShadow:`0 0 24px ${T.indigoMd}`,
            }}>
              Get Started →
            </Link>
            <Link to="https://github.com/SckyzO/rackscope" className="rs-cta-g" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'11px 26px', background:'transparent', color:T.textMid,
              border:`1px solid ${T.borderMd}`, borderRadius:8,
              fontWeight:600, fontSize:'0.95rem', textDecoration:'none',
              transition:'border-color 0.15s, color 0.15s',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Link>
          </div>

          {/* Hierarchy */}
          <div className="rs-a5" style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
            {LEVELS.map((lvl, i) => (
              <React.Fragment key={lvl}>
                <span style={{
                  fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', fontWeight:500,
                  color: i===0 ? T.indigo : i===LEVELS.length-1 ? T.textLo : `rgba(164,180,255,${0.9-i*0.12})`,
                  padding:'3px 9px', borderRadius:5,
                  background: i===0 ? T.indigoLo : 'transparent',
                  border:`1px solid ${i===0 ? T.indigoBorder : 'transparent'}`,
                  letterSpacing:'0.03em',
                }}>{lvl}</span>
                {i < LEVELS.length-1 && <span style={{ color:T.textLo, fontSize:'0.7rem', userSelect:'none' }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── CAROUSEL ─────────────────────────────────────────────────────── */}
      <div style={{ background:T.dark2, padding:'56px 24px 64px', borderBottom:`1px solid ${T.border}` }}>
        <Carousel />
      </div>

      {/* ── PHILOSOPHY ───────────────────────────────────────────────────── */}
      <div style={{ background:T.dark1, padding:'72px 24px', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:T.indigo, letterSpacing:'0.12em', fontWeight:600, textTransform:'uppercase', marginBottom:12 }}>
              Design Philosophy
            </div>
            <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.03em', color:T.textHi, margin:'0 0 12px' }}>
              See your infrastructure,<br />not your spreadsheets.
            </h2>
            <p style={{ color:T.textLo, fontSize:'0.95rem', margin:0, maxWidth:480, marginInline:'auto' }}>
              Three principles that are non-negotiable.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20 }}>
            {[
              { icon:'📄', title:'Zero Database', delay:'0.1s', desc:'Configuration lives in YAML files. GitOps-friendly, version-controlled, diff-friendly. Commit your topology to Git and roll back with git revert.' },
              { icon:'📡', title:'Prometheus-Only', delay:'0.2s', desc:'Every health state comes from a live PromQL query against your existing Prometheus. No agents, no collectors. Zero additional telemetry infrastructure.' },
              { icon:'🏗️', title:'Physical Hierarchy', delay:'0.3s', desc:'Site → Room → Aisle → Rack → Device → Instance. Health states aggregate upward — a failing node makes its rack CRIT, which makes its room CRIT.' },
            ].map(({ icon, title, desc, delay }) => (
              <div key={title} className="rs-philocard" style={{
                animationDelay:delay, padding:'28px 28px 24px',
                background:T.dark3, border:`1px solid ${T.border}`,
                borderRadius:12, position:'relative', overflow:'hidden',
              }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${T.indigo}, transparent)`, opacity:0.6 }} />
                <div style={{ fontSize:'1.6rem', marginBottom:14 }}>{icon}</div>
                <h3 style={{ margin:'0 0 10px', fontSize:'1rem', fontWeight:700, color:T.textHi, letterSpacing:'-0.01em' }}>{title}</h3>
                <p style={{ margin:0, fontSize:'0.9rem', lineHeight:1.65, color:T.textMid }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BUILT FOR ────────────────────────────────────────────────────── */}
      <div style={{ background:T.dark2, padding:'72px 24px', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:T.indigo, letterSpacing:'0.12em', fontWeight:600, textTransform:'uppercase', marginBottom:12 }}>
              Who uses it
            </div>
            <h2 style={{ fontSize:'clamp(1.4rem,2.5vw,1.8rem)', fontWeight:800, letterSpacing:'-0.03em', color:T.textHi, margin:0 }}>
              Built for operators who need answers fast
            </h2>
          </div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {[
              { label:'NOC Operators',   sub:'Physical drill-down from site to node in three clicks. Dark mode first-class.' },
              { label:'N1/N2 Sysadmins', sub:'Know which cabinet, which aisle, which room — not a metric ID or hostname.' },
              { label:'HPC Teams',       sub:'Slurm integration, high-density chassis, liquid cooling, InfiniBand.' },
            ].map(({ label, sub }) => (
              <div key={label} style={{
                display:'flex', alignItems:'flex-start', gap:12,
                padding:'18px 22px', background:T.dark3,
                border:`1px solid ${T.border}`, borderRadius:10, flex:'1 1 200px',
              }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:T.indigo, marginTop:6, flexShrink:0, boxShadow:`0 0 8px ${T.indigo}` }} />
                <div>
                  <div style={{ fontWeight:700, color:T.textHi, fontSize:'0.95rem', marginBottom:3 }}>{label}</div>
                  <div style={{ color:T.textLo, fontSize:'0.82rem', lineHeight:1.5 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <div style={{ background:T.dark1, padding:'80px 24px', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:T.indigo, letterSpacing:'0.12em', fontWeight:600, textTransform:'uppercase', marginBottom:12 }}>
              How it works
            </div>
            <h2 style={{ fontSize:'clamp(1.5rem,3vw,2rem)', fontWeight:800, letterSpacing:'-0.03em', color:T.textHi, margin:'0 0 12px' }}>
              From Prometheus to physical view
            </h2>
            <p style={{ color:T.textLo, fontSize:'0.95rem', margin:0, maxWidth:520, marginInline:'auto' }}>
              Four steps — from your existing infrastructure to a live physical view.
              No agent, no database, no lock-in.
            </p>
          </div>

          {/* 4 steps */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:2, marginBottom:64, position:'relative' }}>
            {[
              {
                num:'01', icon:'📄',
                title:'Define your topology',
                desc:'Write YAML files describing your physical infrastructure — sites, rooms, aisles, racks, devices. Or generate them from NetBox, RacksDB, any script, or the API.',
                tag:'topology.yaml',
              },
              {
                num:'02', icon:'📡',
                title:'Connect Prometheus',
                desc:"One URL. Point Rackscope at your existing Prometheus instance. That's it. No collector to deploy, no agent to install, nothing to change in your stack.",
                tag:'prometheus_url:',
              },
              {
                num:'03', icon:'🔗',
                title:'Map your checks',
                desc:'Any metric with the right labels becomes a visible health check. IPMI temperature, PDU load, software service status, Slurm node state — anything Prometheus scrapes.',
                tag:'expr: up{...}',
              },
              {
                num:'04', icon:'🔭',
                title:'See your infrastructure',
                desc:"Launch and navigate from global to instance level. When something is CRIT, you know exactly which rack, which aisle, which room — not just a hostname in an alert.",
                tag:'make up',
              },
            ].map(({ num, icon, title, desc, tag }, i) => (
              <div key={num} style={{
                padding:'28px 24px',
                background:T.dark3,
                borderRadius: i===0 ? '10px 0 0 10px' : i===3 ? '0 10px 10px 0' : 0,
                border:`1px solid ${T.border}`,
                borderLeft: i>0 ? 'none' : `1px solid ${T.border}`,
                position:'relative',
                display:'flex', flexDirection:'column', gap:12,
              }}>
                {/* Step number */}
                <div style={{
                  fontFamily:"'JetBrains Mono',monospace",
                  fontSize:'0.68rem', fontWeight:700,
                  color:T.textLo, letterSpacing:'0.1em',
                }}>
                  {num}
                </div>
                {/* Icon + title */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <span style={{ fontSize:'1.3rem', flexShrink:0, marginTop:1 }}>{icon}</span>
                  <h3 style={{ margin:0, fontSize:'0.95rem', fontWeight:700, color:T.textHi, letterSpacing:'-0.01em', lineHeight:1.3 }}>{title}</h3>
                </div>
                {/* Description */}
                <p style={{ margin:0, fontSize:'0.85rem', lineHeight:1.65, color:T.textMid, flex:1 }}>{desc}</p>
                {/* Tag */}
                <div style={{
                  fontFamily:"'JetBrains Mono',monospace",
                  fontSize:'0.72rem', color:T.indigo,
                  background:T.indigoLo, border:`1px solid ${T.indigoBorder}`,
                  borderRadius:5, padding:'3px 10px', display:'inline-block',
                  alignSelf:'flex-start',
                }}>{tag}</div>
                {/* Connector arrow (except last) */}
                {i < 3 && (
                  <div style={{
                    position:'absolute', right:-12, top:'50%',
                    transform:'translateY(-50%)',
                    width:24, height:24,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background:T.dark2, border:`1px solid ${T.border}`,
                    borderRadius:'50%', zIndex:1,
                    color:T.textLo, fontSize:'0.75rem',
                  }}>→</div>
                )}
              </div>
            ))}
          </div>

          {/* Doc cards */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <p style={{ color:T.textLo, fontSize:'0.9rem', margin:0 }}>
              The documentation covers everything in detail. Start where it makes sense for you.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:14 }}>
            {[
              {
                icon:'🚀', label:'Quick Start', sub:'Up in 5 minutes',
                desc:'Clone, configure, launch. Full step-by-step with prerequisites.',
                to:'/getting-started/quick-start',
              },
              {
                icon:'📦', label:'Examples', sub:'Ready-made topologies',
                desc:'From a simple 4-rack lab to an 855-node HPC cluster. Load in one command.',
                to:'/getting-started/examples',
              },
              {
                icon:'⚙️', label:'Admin Guide', sub:'Production deployment',
                desc:'Docker images, GHCR, nginx, config reference, app.yaml explained.',
                to:'/admin-guide/deployment',
              },
              {
                icon:'🔌', label:'API Reference', sub:'Automate & integrate',
                desc:'Generate topology from scripts, push checks, query health states.',
                to:'/api-reference/overview',
              },
            ].map(({ icon, label, sub, desc, to }) => (
              <Link key={label} to={to}
                style={{
                  display:'flex', flexDirection:'column', gap:8,
                  padding:'20px 20px 16px',
                  background:T.dark3, border:`1px solid ${T.border}`,
                  borderRadius:10, textDecoration:'none',
                  transition:'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.indigoBorder; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform='translateY(0)'; }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:'1.2rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight:700, color:T.textHi, fontSize:'0.9rem' }}>{label}</div>
                    <div style={{ color:T.indigo, fontSize:'0.75rem', fontFamily:"'JetBrains Mono',monospace" }}>{sub}</div>
                  </div>
                </div>
                <p style={{ margin:0, fontSize:'0.82rem', lineHeight:1.55, color:T.textMid }}>{desc}</p>
                <div style={{ color:T.indigo, fontSize:'0.8rem', fontWeight:600, marginTop:'auto' }}>Read →</div>
              </Link>
            ))}
          </div>
        </div>
      </div>


      {/* ── PAGE FOOTER ──────────────────────────────────────────────────── */}
      <div style={{
        background: T.dark2,
        borderTop: `1px solid ${T.border}`,
        padding: '24px',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:T.textLo, letterSpacing:'0.04em' }}>
            Rackscope · AGPL-3.0
          </span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:T.textLo, letterSpacing:'0.04em', fontStyle:'italic' }}>
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
                color:T.textLo, textDecoration:'none',
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
    </Layout>
  );
}
