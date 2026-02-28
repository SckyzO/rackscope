// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Rackscope',
  tagline: 'Prometheus-first physical infrastructure monitoring',
  favicon: 'img/favicon.ico',

  url: 'https://rackscope.dev',
  // DOCS_BASE_URL env var allows deploying to GitHub Pages subdirectory
  // (e.g. /rackscope/) or a custom domain root (/).
  // Set the repository variable DOCS_BASE_URL in GitHub Actions settings.
  baseUrl: process.env.DOCS_BASE_URL || '/',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

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
            href: 'https://github.com/SckyzO/rackscope',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Quick Start', to: '/getting-started/quick-start' },
              { label: 'Configuration', to: '/getting-started/configuration' },
              { label: 'API Reference', to: '/api-reference/overview' },
            ],
          },
          {
            title: 'Project',
            items: [
              { label: 'GitHub', href: 'https://github.com/SckyzO/rackscope' },
              { label: 'Changelog', href: 'https://github.com/SckyzO/rackscope/blob/main/CHANGELOG.md' },
              { label: 'Issues', href: 'https://github.com/SckyzO/rackscope/issues' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Rackscope. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['python', 'yaml', 'typescript', 'bash', 'json', 'promql'],
      },
    }),
};

export default config;
