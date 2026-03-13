// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  gettingStarted: [
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
      label: 'Views',
      className: 'sidebar-cat-monitor',
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
      label: 'Editors',
      className: 'sidebar-cat-pencil',
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
      label: 'Plugins & Features',
      className: 'sidebar-cat-puzzle',
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
      label: 'Interface',
      className: 'sidebar-cat-sliders',
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
    // ── Deployment & Operations ───────────────────────────────────────────────
    {
      type: 'category',
      label: 'Deployment',
      className: 'sidebar-cat-rocket',
      collapsed: false,
      items: [
        'admin-guide/deployment',
        'admin-guide/app-yaml',
        'admin-guide/settings-ui',
      ],
    },

    // ── Configuration ─────────────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Configuration',
      className: 'sidebar-cat-folder',
      collapsed: false,
      items: [
        'admin-guide/topology-yaml',
        'admin-guide/templates',
        'admin-guide/prometheus',
        'admin-guide/importers',
      ],
    },
  ],

  apiReference: [
    'api-reference/overview',

    // ── Infrastructure ─────────────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Infrastructure',
      className: 'sidebar-cat-server',
      collapsed: false,
      items: [
        'api-reference/telemetry',
        'api-reference/topology',
      ],
    },

    // ── Data & Plugins ─────────────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Data & Plugins',
      className: 'sidebar-cat-database',
      collapsed: false,
      items: [
        'api-reference/metrics',
        'api-reference/plugins',
      ],
    },
  ],

  architecture: [
    'architecture/overview',

    // ── Core ──────────────────────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Core',
      className: 'sidebar-cat-sliders',
      collapsed: false,
      items: [
        'architecture/data-model',
        'architecture/backend',
        'architecture/frontend',
      ],
    },

    // ── Features ──────────────────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Features',
      className: 'sidebar-cat-code',
      collapsed: false,
      items: [
        'architecture/dashboard-widgets',
      ],
    },
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
