import React from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

const features = [
  {
    title: 'Prometheus-First',
    description: 'Live PromQL queries — no internal time-series DB. Works with your existing Prometheus setup.',
  },
  {
    title: 'File-Based Topology',
    description: 'YAML is the source of truth. GitOps-friendly, version-controlled, diff-friendly.',
  },
  {
    title: 'HPC Native',
    description: 'Twins, Quads, Blades, liquid cooling, dense chassis, and Slurm integration out of the box.',
  },
  {
    title: 'Plugin Architecture',
    description: 'Slurm and Simulator as plugins. Extensible for new integrations without touching core.',
  },
  {
    title: 'Template-Driven',
    description: 'Define hardware once, reuse across racks. Metrics and checks follow the template.',
  },
  {
    title: 'NOC-Ready',
    description: 'Dark mode first-class. Physical drill-down from site to node in three clicks.',
  },
];

function FeatureCard({ title, description }) {
  return (
    <div style={{
      padding: '1.5rem',
      border: '1px solid var(--ifm-color-emphasis-200)',
      borderRadius: '8px',
      background: 'var(--ifm-background-surface-color)',
    }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ marginBottom: 0, color: 'var(--ifm-color-emphasis-700)' }}>{description}</p>
    </div>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}
    >
      {/* Hero */}
      <header style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0f1117 0%, #1a1d27 50%, #0f1117 100%)',
        borderBottom: '1px solid var(--ifm-color-emphasis-200)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 800,
            margin: '0 0 1rem',
            background: 'linear-gradient(135deg, #fff 0%, #6a7aff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Rackscope
          </h1>
          <p style={{
            fontSize: '1.3rem',
            color: 'var(--ifm-color-emphasis-700)',
            marginBottom: '2rem',
          }}>
            {siteConfig.tagline}
          </p>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--ifm-color-emphasis-600)',
            marginBottom: '2.5rem',
            maxWidth: '600px',
            margin: '0 auto 2.5rem',
          }}>
            Visualize the full physical hierarchy — Site → Room → Aisle → Rack → Device — using
            live Prometheus metrics. No database. No agent. Pure YAML + PromQL.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/getting-started/quick-start"
              style={{
                padding: '0.75rem 2rem',
                background: '#465fff',
                color: 'white',
                borderRadius: '6px',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '1rem',
              }}
            >
              Quick Start →
            </Link>
            <Link
              to="https://github.com/SckyzO/rackscope"
              style={{
                padding: '0.75rem 2rem',
                border: '1px solid var(--ifm-color-emphasis-300)',
                color: 'var(--ifm-color-emphasis-800)',
                borderRadius: '6px',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '1rem',
              }}
            >
              GitHub
            </Link>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '3rem',
        padding: '1.5rem 2rem',
        background: 'var(--ifm-background-surface-color)',
        borderBottom: '1px solid var(--ifm-color-emphasis-200)',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Tests', value: '852+ passing' },
          { label: 'Type errors', value: '0 (mypy)' },
          { label: 'Checks', value: '7 families' },
          { label: 'License', value: 'AGPL-3.0' },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#6a7aff' }}>{value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-600)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <main style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2.5rem' }}>Why Rackscope?</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '4rem',
        }}>
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>

        {/* Quick example */}
        <div style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-color-emphasis-200)',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{ marginTop: 0 }}>Start in 3 steps</h2>
          <pre style={{
            background: 'var(--ifm-color-emphasis-100)',
            borderRadius: '6px',
            padding: '1.5rem',
            overflow: 'auto',
          }}>
            <code>{`git clone https://github.com/SckyzO/rackscope.git
cd rackscope
make up   # → http://localhost:5173`}</code>
          </pre>
          <p style={{ marginBottom: 0, color: 'var(--ifm-color-emphasis-700)' }}>
            The stack starts with a demo topology and simulated metrics — no hardware required.
            {' '}<Link to="/getting-started/quick-start">Full setup guide →</Link>
          </p>
        </div>
      </main>
    </Layout>
  );
}
