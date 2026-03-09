import React, { useEffect, useRef } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  indigo:   '#465fff',
  indigoLo: 'rgba(70,95,255,0.12)',
  indigoMd: 'rgba(70,95,255,0.25)',
  indigoBorder: 'rgba(70,95,255,0.35)',
  dark1: '#0f1117',
  dark2: '#13161f',
  dark3: '#1a1d27',
  dark4: '#21253a',
  textHi:  '#f0f2ff',
  textMid: '#9ba3c9',
  textLo:  '#5a6180',
  border:  'rgba(255,255,255,0.07)',
  borderMd:'rgba(255,255,255,0.12)',
};

// ── Keyframes ─────────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes rs-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rs-glow-pulse {
    0%,100% { opacity: 0.5; }
    50%      { opacity: 1; }
  }
  .rs-anim-0 { animation: rs-fade-up 0.6s ease both 0.05s; }
  .rs-anim-1 { animation: rs-fade-up 0.6s ease both 0.15s; }
  .rs-anim-2 { animation: rs-fade-up 0.6s ease both 0.25s; }
  .rs-anim-3 { animation: rs-fade-up 0.6s ease both 0.35s; }
  .rs-anim-4 { animation: rs-fade-up 0.6s ease both 0.45s; }
  .rs-anim-5 { animation: rs-fade-up 0.8s ease both 0.55s; }
  .rs-card-c { animation: rs-fade-up 0.6s ease both; }
  .rs-philocard:hover { border-color: rgba(70,95,255,0.35) !important; transform: translateY(-2px); }
  .rs-cta-primary:hover { background: #3248e0 !important; transform: translateY(-1px); }
  .rs-cta-ghost:hover { border-color: #465fff !important; color: #f0f2ff !important; }
  .rs-qs-link:hover { background: rgba(70,95,255,0.25) !important; }
`;

const LEVELS = ['Site', 'Room', 'Aisle', 'Rack', 'Device', 'Instance'];

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <style>{KEYFRAMES}</style>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(180deg, ${T.dark1} 0%, ${T.dark2} 100%)`,
        borderBottom: `1px solid ${T.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 100%)',
        }} />
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: `radial-gradient(ellipse, rgba(70,95,255,0.25) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 860, margin: '0 auto',
          padding: '88px 24px 80px',
          position: 'relative', textAlign: 'center',
        }}>
          {/* Open-source badge */}
          <div className="rs-anim-0" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px',
            background: T.indigoLo,
            border: `1px solid ${T.indigoBorder}`,
            borderRadius: 999, marginBottom: 28,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: T.indigo,
              boxShadow: `0 0 6px ${T.indigo}`,
              animation: 'rs-glow-pulse 2s ease infinite',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem', color: T.indigo,
              letterSpacing: '0.08em', fontWeight: 600,
            }}>
              Open Source · AGPL-3.0
            </span>
          </div>

          {/* Title */}
          <h1 className="rs-anim-1" style={{
            fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
            fontWeight: 800, margin: '0 0 16px',
            letterSpacing: '-0.04em', lineHeight: 1.08,
            background: `linear-gradient(135deg, ${T.textHi} 40%, ${T.indigo} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Rackscope
          </h1>

          {/* Tagline */}
          <p className="rs-anim-2" style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', fontWeight: 500,
            color: T.textMid, margin: '0 0 20px', letterSpacing: '-0.01em',
          }}>
            Prometheus-first physical infrastructure monitoring
          </p>

          {/* Description */}
          <p className="rs-anim-3" style={{
            fontSize: '1rem', color: T.textLo, lineHeight: 1.75,
            maxWidth: 580, margin: '0 auto 36px',
          }}>
            A visualization layer for data centers and HPC environments.
            Powered entirely by live PromQL queries — no internal time-series database,
            no agents, no CMDB ownership. Your Prometheus, your topology, your rules.
          </p>

          {/* CTAs */}
          <div className="rs-anim-4" style={{
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            marginBottom: 40,
          }}>
            <Link to="/getting-started/quick-start"
              className="rs-cta-primary"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 26px', background: T.indigo, color: '#fff',
                borderRadius: 8, fontWeight: 700, fontSize: '0.95rem',
                textDecoration: 'none', letterSpacing: '-0.01em',
                transition: 'background 0.15s, transform 0.15s',
                boxShadow: `0 0 24px rgba(70,95,255,0.3)`,
              }}>
              Get Started →
            </Link>
            <Link to="https://github.com/SckyzO/rackscope"
              className="rs-cta-ghost"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 26px', background: 'transparent', color: T.textMid,
                border: `1px solid ${T.borderMd}`,
                borderRadius: 8, fontWeight: 600, fontSize: '0.95rem',
                textDecoration: 'none',
                transition: 'border-color 0.15s, color 0.15s',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Link>
          </div>

          {/* Hierarchy breadcrumb */}
          <div className="rs-anim-5" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {LEVELS.map((level, i) => (
              <React.Fragment key={level}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem', fontWeight: 500,
                  color: i === 0 ? T.indigo
                        : i === LEVELS.length - 1 ? T.textLo
                        : `rgba(164,180,255,${0.9 - i * 0.12})`,
                  padding: '3px 9px', borderRadius: 5,
                  background: i === 0 ? T.indigoLo : 'transparent',
                  border: `1px solid ${i === 0 ? T.indigoBorder : 'transparent'}`,
                  letterSpacing: '0.03em',
                }}>
                  {level}
                </span>
                {i < LEVELS.length - 1 && (
                  <span style={{ color: T.textLo, fontSize: '0.7rem', userSelect: 'none' }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── DASHBOARD SCREENSHOT ──────────────────────────────────────────── */}
      <div style={{
        background: T.dark2,
        padding: '56px 24px 64px',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div className="rs-anim-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Browser chrome */}
          <div style={{
            background: T.dark4,
            borderRadius: '12px 12px 0 0',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
            border: `1px solid ${T.borderMd}`,
            borderBottom: 'none',
          }}>
            {['#ff5f56','#ffbd2e','#27c93f'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.85 }} />
            ))}
            <div style={{
              flex: 1, maxWidth: 340, margin: '0 auto',
              background: T.dark3, borderRadius: 6, padding: '4px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.textLo, opacity: 0.5 }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.72rem', color: T.textLo, letterSpacing: '0.02em',
              }}>
                localhost:5173
              </span>
            </div>
          </div>
          {/* Screenshot */}
          <div style={{
            border: `1px solid ${T.borderMd}`, borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
            boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(70,95,255,0.15)`,
          }}>
            <img
              src="/img/screenshots/dashboard-overview.png"
              alt="Rackscope dashboard overview — infrastructure monitoring with physical hierarchy"
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </div>

      {/* ── PHILOSOPHY ───────────────────────────────────────────────────── */}
      <div style={{
        background: T.dark1,
        padding: '72px 24px',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem', color: T.indigo,
              letterSpacing: '0.12em', fontWeight: 600,
              textTransform: 'uppercase', marginBottom: 12,
            }}>
              Design Philosophy
            </div>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800,
              letterSpacing: '-0.03em', color: T.textHi, margin: '0 0 12px',
            }}>
              See your infrastructure,<br />not your spreadsheets.
            </h2>
            <p style={{ color: T.textLo, fontSize: '0.95rem', margin: 0, maxWidth: 480, marginInline: 'auto' }}>
              Three principles that are non-negotiable.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {[
              {
                icon: '📄', title: 'Zero Database', delay: '0.1s',
                desc: 'Configuration lives in YAML files. GitOps-friendly, version-controlled, diff-friendly. Commit your topology to Git and roll back with git revert.',
              },
              {
                icon: '📡', title: 'Prometheus-Only', delay: '0.2s',
                desc: 'Every health state comes from a live PromQL query against your existing Prometheus. No agents, no collectors. Zero additional telemetry infrastructure.',
              },
              {
                icon: '🏗️', title: 'Physical Hierarchy', delay: '0.3s',
                desc: 'Site → Room → Aisle → Rack → Device → Instance. Health states aggregate upward — a failing node makes its rack CRIT, which makes its room CRIT.',
              },
            ].map(({ icon, title, desc, delay }) => (
              <div key={title}
                className="rs-philocard"
                style={{
                  animationDelay: delay,
                  padding: '28px 28px 24px',
                  background: T.dark3,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  position: 'relative', overflow: 'hidden',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, ${T.indigo}, transparent)`,
                  opacity: 0.6,
                }} />
                <div style={{ fontSize: '1.6rem', marginBottom: 14 }}>{icon}</div>
                <h3 style={{
                  margin: '0 0 10px', fontSize: '1rem', fontWeight: 700,
                  color: T.textHi, letterSpacing: '-0.01em',
                }}>
                  {title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.65, color: T.textMid }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BUILT FOR ────────────────────────────────────────────────────── */}
      <div style={{ background: T.dark2, padding: '72px 24px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.72rem', color: T.indigo,
              letterSpacing: '0.12em', fontWeight: 600,
              textTransform: 'uppercase', marginBottom: 12,
            }}>
              Who uses it
            </div>
            <h2 style={{
              fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 800,
              letterSpacing: '-0.03em', color: T.textHi, margin: 0,
            }}>
              Built for operators who need answers fast
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'NOC Operators', sub: 'Physical drill-down from site to node in three clicks. Dark mode first-class.' },
              { label: 'N1/N2 Sysadmins', sub: 'Know which cabinet, which aisle, which room — not a metric ID or hostname.' },
              { label: 'HPC Teams', sub: 'Slurm integration, high-density chassis, liquid cooling, InfiniBand.' },
            ].map(({ label, sub }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '18px 22px', background: T.dark3,
                border: `1px solid ${T.border}`, borderRadius: 10,
                flex: '1 1 200px',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: T.indigo, marginTop: 6, flexShrink: 0,
                  boxShadow: `0 0 8px ${T.indigo}`,
                }} />
                <div>
                  <div style={{ fontWeight: 700, color: T.textHi, fontSize: '0.95rem', marginBottom: 3 }}>{label}</div>
                  <div style={{ color: T.textLo, fontSize: '0.82rem', lineHeight: 1.5 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── QUICK START ──────────────────────────────────────────────────── */}
      <div style={{ background: T.dark1, padding: '72px 24px 80px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.72rem', color: T.indigo,
            letterSpacing: '0.12em', fontWeight: 600,
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            Quick Start
          </div>
          <h2 style={{
            fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 800,
            letterSpacing: '-0.03em', color: T.textHi, margin: '0 0 12px',
          }}>
            Running in 3 commands
          </h2>
          <p style={{ color: T.textLo, fontSize: '0.9rem', marginBottom: 32 }}>
            No local Python or Node.js required — everything runs in containers.
          </p>

          <div style={{
            background: T.dark3, border: `1px solid ${T.borderMd}`,
            borderRadius: 10, overflow: 'hidden',
            textAlign: 'left', marginBottom: 28,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
              background: T.dark4,
            }}>
              {['#ff5f56','#ffbd2e','#27c93f'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
              ))}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.72rem', color: T.textLo, marginLeft: 8,
              }}>
                terminal
              </span>
            </div>
            <div style={{ padding: '20px' }}>
              {[
                ['$', 'git clone', ' https://github.com/SckyzO/rackscope.git', null],
                ['$', 'cd', ' rackscope', null],
                ['$', 'make up', '', '  # → http://localhost:5173'],
              ].map(([prompt, cmd, arg, comment], i) => (
                <div key={i} style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.87rem', lineHeight: 1.9,
                  display: 'flex', flexWrap: 'wrap', gap: '0 4px',
                }}>
                  <span style={{ color: T.textLo, userSelect: 'none' }}>{prompt}</span>
                  <span style={{ color: T.indigo, fontWeight: 600 }}>{cmd}</span>
                  <span style={{ color: T.textHi }}>{arg}</span>
                  {comment && <span style={{ color: T.textLo, opacity: 0.5 }}>{comment}</span>}
                </div>
              ))}
            </div>
          </div>

          <Link to="/getting-started/quick-start"
            className="rs-qs-link"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 28px',
              background: T.indigoLo,
              color: T.indigo,
              border: `1px solid ${T.indigoBorder}`,
              borderRadius: 8, fontWeight: 700, fontSize: '0.95rem',
              textDecoration: 'none', letterSpacing: '-0.01em',
              transition: 'background 0.15s',
            }}>
            View full guide →
          </Link>
        </div>
      </div>

      {/* ── Footer strip ─────────────────────────────────────────────────── */}
      <div style={{
        background: T.dark2, borderTop: `1px solid ${T.border}`,
        padding: '20px 24px', textAlign: 'center',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem', color: T.textLo, letterSpacing: '0.04em',
        }}>
          Rackscope — AGPL-3.0 · Not another Grafana plugin.
        </span>
      </div>
    </Layout>
  );
}
