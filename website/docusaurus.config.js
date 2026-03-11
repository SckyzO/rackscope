// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Rackscope',
  tagline: 'Prometheus-first physical infrastructure monitoring',
  favicon: 'img/favicon.svg',

  url: 'https://rackscope.dev',
  // DOCS_BASE_URL env var allows deploying to GitHub Pages subdirectory
  // (e.g. /rackscope/) or a custom domain root (/).
  // Set the repository variable DOCS_BASE_URL in GitHub Actions settings.
  baseUrl: process.env.DOCS_BASE_URL || '/',

  onBrokenLinks: 'warn',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: [
    // CSS theme — Void/Slate palette, Outfit + IBM Plex Mono, full Infima coverage
    // injectFavicon: false — Rackscope has its own favicon (img/favicon.svg)
    ['cosmos-docusaurus-theme', { injectFavicon: false }],
    // Mermaid diagrams — native Docusaurus 3 support
    '@docusaurus/theme-mermaid',
    // Local search — zero config, no API key, works with GitHub Pages
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: '/',
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 8,
        searchBarShortcutHint: true,
      },
    ],
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/SckyzO/rackscope/tree/main/website/',
        },
        blog: false,
        theme: {
          // Only Rackscope-specific overrides — base theme handled by cosmos-docusaurus-theme
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Rackscope',
        logo: {
          alt: 'Rackscope Logo',
          src: 'img/logo.svg',
          href: '/',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'gettingStarted',
            position: 'left',
            label: 'Getting Started',
          },
          {
            type: 'docSidebar',
            sidebarId: 'userGuide',
            position: 'left',
            label: 'User Guide',
          },
          {
            type: 'docSidebar',
            sidebarId: 'adminGuide',
            position: 'left',
            label: 'Admin Guide',
          },
          {
            type: 'docSidebar',
            sidebarId: 'apiReference',
            position: 'left',
            label: 'API',
          },
          {
            type: 'docSidebar',
            sidebarId: 'plugins',
            position: 'left',
            label: 'Plugins',
          },
          {
            type: 'docSidebar',
            sidebarId: 'architecture',
            position: 'left',
            label: 'Architecture',
          },
          // Search positioned explicitly before GitHub link
          { type: 'search', position: 'right' },
          {
            href: 'https://github.com/SckyzO/rackscope',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      // Footer — copyright only, no redundant link columns
      footer: {
        style: 'dark',
        links: [],
        copyright: `Copyright © ${new Date().getFullYear()} Rackscope · AGPL-3.0`,
      },
      // Mermaid — aligned with Void/Slate palette + brand indigo
      mermaid: {
        theme: { light: 'base', dark: 'base' },
        options: {
          fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
          fontSize: 14,
          // Dark mode (Void palette) themeVariables — applied via CSS per-mode below
          themeVariables: {
            // Base palette — overridden in custom.css for light/dark split
            primaryColor: '#1a2535',
            primaryTextColor: '#e5e5e5',
            primaryBorderColor: '#465fff',
            lineColor: '#465fff',
            secondaryColor: '#111827',
            tertiaryColor: '#1f2937',
            background: '#030712',
            mainBkg: '#111827',
            nodeBorder: '#465fff',
            clusterBkg: '#1e2a3a',
            clusterBorder: '#374151',
            titleColor: '#e5e5e5',
            edgeLabelBackground: '#1f2937',
            attributeBackgroundColorEven: '#111827',
            attributeBackgroundColorOdd: '#1a2535',
          },
        },
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['python', 'yaml', 'typescript', 'bash', 'json', 'promql'],
      },
    }),
};

export default config;
