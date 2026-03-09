// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  gettingStarted: [
    'intro',
    'getting-started/quick-start',
    'getting-started/installation',
    'getting-started/configuration',
    'getting-started/examples',
  ],

  userGuide: [
    'user-guide/overview',

    // ── Views ────────────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '📊 Views',
      collapsed: false,
      items: [
        'user-guide/views',
        'user-guide/room-view',
        'user-guide/cluster-view',
      ],
    },

    // ── Editors ──────────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '🛠️ Editors',
      collapsed: false,
      items: [
        'user-guide/editors',
        'user-guide/topology-editor',
        'user-guide/dashboard',
      ],
    },

    // ── Plugins & Features ───────────────────────────────────────────────────
    {
      type: 'category',
      label: '🔌 Plugins & Features',
      collapsed: false,
      items: [
        'user-guide/health-checks',
        'user-guide/slurm',
        'user-guide/simulator',
        'user-guide/playlist',
        'user-guide/notifications',
      ],
    },

    // ── Interface ────────────────────────────────────────────────────────────
    {
      type: 'category',
      label: '⚙️ Interface',
      collapsed: true,
      items: [
        'user-guide/ui-library',
        'user-guide/login',
        'user-guide/wizard',
        'user-guide/error-pages',
        'user-guide/about',
      ],
    },
  ],

  adminGuide: [
    'admin-guide/deployment',
    'admin-guide/topology-yaml',
    'admin-guide/templates',
    'admin-guide/prometheus',
    'admin-guide/app-yaml',
    'admin-guide/settings-ui',
    'admin-guide/importers',
  ],

  apiReference: [
    'api-reference/overview',
    'api-reference/telemetry',
    'api-reference/topology',
    'api-reference/metrics',
    'api-reference/plugins',
  ],

  architecture: [
    'architecture/overview',
    'architecture/data-model',
    'architecture/backend',
    'architecture/frontend',
    'architecture/dashboard-widgets',
  ],

  development: [
    'development/testing',
    'development/security',
  ],

  designSystem: [
    'design-system/overview',
  ],

  plugins: [
    'plugins/overview',
    'plugins/simulator',
    'plugins/slurm',
    'plugins/writing-plugins',
  ],
};

export default sidebars;
